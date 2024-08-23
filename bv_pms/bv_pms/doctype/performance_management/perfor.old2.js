frappe.ui.form.on("Performance Management", {
  onload: function (frm) {
    // updateTotalKPIWeightage(frm);
    // updateOverallLOPRating(frm);
  },
  before_save: function (frm) {
    updateTotalKPIWeightage(frm);
    // updateOverallLOPRating(frm);
    updateAllQuarterlyCalculations(frm);
  },
  import_kra_template: function (frm) {
    new frappe.ui.form.MultiSelectDialog({
      doctype: "GOAL and KRA Template",
      target: frm,
      setters: {
        department: frm.doc.department,
        designation: frm.doc.designation,
      },
      get_query: function () {
        return {
          filters: {
            department: frm.doc.department,
            designation: frm.doc.designation,
          },
        };
      },
      action: function (selections) {
        frappe.call({
          method: "frappe.client.get",
          args: {
            doctype: "GOAL and KRA Template",
            name: selections[0], // Assuming single selection for simplicity
          },
          callback: function (r) {
            if (r.message) {
              var template = r.message;

              frm.set_value("template_selected", template.name);

              // Clear existing quarter tables
              frm.clear_table("kra_kpi_mop_q1");
              frm.clear_table("kra_kpi_mop_q2");
              frm.clear_table("kra_kpi_mop_q3");
              frm.clear_table("kra_kpi_mop_q4");

              // Reset quarter checkboxes
              frm.set_value("q1", 0);
              frm.set_value("q2", 0);
              frm.set_value("q3", 0);
              frm.set_value("q4", 0);

              // Process and distribute KPIs and MOPs into the appropriate quarter tables
              distributeToQuarterTables(frm, template.kpis_and_mops);
              // calculateTotalWeightages(frm);

              frm.refresh_fields([
                "kra_kpi_mop_q1",
                "kra_kpi_mop_q2",
                "kra_kpi_mop_q3",
                "kra_kpi_mop_q4",
              ]);
              cur_dialog.hide();
            }
          },
        });
      },
    });
  },
});

frappe.ui.form.on("KRA KPI and Measure of Performance", {
  kpi_weightage: function (frm, cdt, cdn) {
    let row = locals[cdt][cdn];
    row.kra_weightage = row.kpi_weightage;

    // Recalculate rating score if LOP by manager is already set
    if (row.quarterly_lop_by_manager) {
      updateRatingScore(frm, row);
    }

    // Trigger total KPI weightage and quarterly calculations
    updateTotalKPIWeightage(frm);
    updateAllQuarterlyCalculations(frm);
    frm.refresh_fields([
      "kra_kpi_mop_q1",
      "kra_kpi_mop_q2",
      "kra_kpi_mop_q3",
      "kra_kpi_mop_q4",
    ]);
  },
  quarterly_lop_by_manager: function (frm, cdt, cdn) {
    let row = locals[cdt][cdn];
    updateRatingScore(frm, row);
    updateAllQuarterlyCalculations(frm);
    frm.refresh_field("kra_kpi_mop_q1");
    frm.refresh_field("kra_kpi_mop_q2");
    frm.refresh_field("kra_kpi_mop_q3");
    frm.refresh_field("kra_kpi_mop_q4");
  },
});

function distributeToQuarterTables(frm, kpisAndMops) {
  let kraTracker = {
    q1: new Set(),
    q2: new Set(),
    q3: new Set(),
    q4: new Set(),
  };

  kpisAndMops.forEach(function (item) {
    let addToAllQuarters = !item.q1 && !item.q2 && !item.q3 && !item.q4;

    // Process for Q1
    if (item.q1 || addToAllQuarters) {
      frm.set_value("q1", 1); // Check the Q1 checkbox
      addRowToQuarterTable(
        frm,
        item,
        "kra_kpi_mop_q1",
        "q1",
        kraTracker.q1,
        addToAllQuarters
      );
    }
    // Process for Q2
    if (item.q2 || addToAllQuarters) {
      frm.set_value("q2", 1); // Check the Q2 checkbox
      addRowToQuarterTable(
        frm,
        item,
        "kra_kpi_mop_q2",
        "q2",
        kraTracker.q2,
        addToAllQuarters
      );
    }
    // Process for Q3
    if (item.q3 || addToAllQuarters) {
      frm.set_value("q3", 1); // Check the Q3 checkbox
      addRowToQuarterTable(
        frm,
        item,
        "kra_kpi_mop_q3",
        "q3",
        kraTracker.q3,
        addToAllQuarters
      );
    }
    // Process for Q4
    if (item.q4 || addToAllQuarters) {
      frm.set_value("q4", 1); // Check the Q4 checkbox
      addRowToQuarterTable(
        frm,
        item,
        "kra_kpi_mop_q4",
        "q4",
        kraTracker.q4,
        addToAllQuarters
      );
    }
  });
}

// Add row to the appropriate quarter table
function addRowToQuarterTable(
  frm,
  item,
  tableField,
  quarterKey,
  kraTracker,
  addToAllQuarters
) {
  // Check if the KRA has already been added to this quarter
  let existingRows = frm.doc[tableField].filter((row) => row.kra === item.kra);

  if (existingRows.length === 0) {
    // Add KRA only if not already present
    let kraRow = frm.add_child(tableField);
    kraRow.kra = item.kra;
    kraRow.kpi = item.kpi;
    kraRow.mop = item.mop;
    kraRow.kpi_weightage = item.kpi_weightage;
    kraRow.kra_weightage = item.kra_weightage;
    kraRow.target_matrix = item[quarterKey]; // Set the target matrix field
    kraTracker.add(item.kra);
  } else {
    // Add subsequent rows with empty KRA if needed
    let kraRow = frm.add_child(tableField);
    kraRow.kra = ""; // Empty to avoid duplication of KRA
    kraRow.kpi = item.kpi;
    kraRow.mop = item.mop;
    kraRow.kpi_weightage = item.kpi_weightage;
    kraRow.kra_weightage = item.kra_weightage;
    kraRow.target_matrix = item[quarterKey]; // Set the target matrix field
  }
}

function updateTotalKPIWeightage(frm) {
  // Calculate total KPI weightage for each quarter
  let totalWeightageQ1 = 0,
    totalWeightageQ2 = 0,
    totalWeightageQ3 = 0,
    totalWeightageQ4 = 0;

  frm.doc.kra_kpi_mop_q1.forEach((row) => {
    totalWeightageQ1 += flt(row.kpi_weightage);
  });
  frm.doc.kra_kpi_mop_q2.forEach((row) => {
    totalWeightageQ2 += flt(row.kpi_weightage);
  });
  frm.doc.kra_kpi_mop_q3.forEach((row) => {
    totalWeightageQ3 += flt(row.kpi_weightage);
  });
  frm.doc.kra_kpi_mop_q4.forEach((row) => {
    totalWeightageQ4 += flt(row.kpi_weightage);
  });

  frm.set_value("total_kpi_weightage_q1", totalWeightageQ1);
  frm.set_value("total_kpi_weightage_q2", totalWeightageQ2);
  frm.set_value("total_kpi_weightage_q3", totalWeightageQ3);
  frm.set_value("total_kpi_weightage_q4", totalWeightageQ4);
}

function updateRatingScore(frm, row) {
  let multiplier = 0;
  switch (row.quarterly_lop_by_manager) {
    case "L5":
      multiplier = 1.3;
      break;
    case "L4":
      multiplier = 1.0;
      break;
    case "L3":
      multiplier = 0.75;
      break;
    case "L2":
      multiplier = 0.45;
      break;
    default:
      multiplier = 0;
  }

  row.rating_score = flt(row.kpi_weightage) * multiplier;
}

function updateAllQuarterlyCalculations(frm) {
  // Perform calculations for all quarters
  updateQuarterlyCalculations(
    frm,
    "kra_kpi_mop_q1",
    "overall_lop_rating_q1",
    "level_of_performance_q1",
    "eligible_variable_payout_amount_q1",
    "actual_variable_payout_amount_q1"
  );
  updateQuarterlyCalculations(
    frm,
    "kra_kpi_mop_q2",
    "overall_lop_rating_q2",
    "level_of_performance_q2",
    "eligible_variable_payout_amount_q2",
    "actual_variable_payout_amount_q2"
  );
  updateQuarterlyCalculations(
    frm,
    "kra_kpi_mop_q3",
    "overall_lop_rating_q3",
    "level_of_performance_q3",
    "eligible_variable_payout_amount_q3",
    "actual_variable_payout_amount_q3"
  );
  updateQuarterlyCalculations(
    frm,
    "kra_kpi_mop_q4",
    "overall_lop_rating_q4",
    "level_of_performance_q4",
    "eligible_variable_payout_amount_q4",
    "actual_variable_payout_amount_q4"
  );

  frm.refresh_fields();
}

function updateQuarterlyCalculations(
  frm,
  tableField,
  overallRatingField,
  performanceField,
  eligiblePayoutField,
  actualPayoutField
) {
  let totalRating = 0;

  frm.doc[tableField].forEach((row) => {
    totalRating += flt(row.rating_score);
  });

  frm.set_value(overallRatingField, totalRating);

  let levelOfPerformance = calculateLevelOfPerformance(totalRating);
  frm.set_value(performanceField, levelOfPerformance);

  let eligiblePayout = frm.doc[eligiblePayoutField];
  let actualPayout = calculateActualVariablePayout(
    levelOfPerformance,
    eligiblePayout
  );
  frm.set_value(actualPayoutField, actualPayout);
}

function calculateLevelOfPerformance(overallRating) {
  if (overallRating >= 100) return "L5";
  if (overallRating >= 90) return "L4";
  if (overallRating >= 75) return "L3";
  if (overallRating >= 60) return "L2";
  return "L1";
}

function calculateActualVariablePayout(levelOfPerformance, eligiblePayout) {
  let multiplier = 0;
  switch (levelOfPerformance) {
    case "L5":
      multiplier = 1.3;
      break;
    case "L4":
      multiplier = 1.0;
      break;
    case "L3":
      multiplier = 0.75;
      break;
    case "L2":
      multiplier = 0.45;
      break;
    default:
      multiplier = 0;
  }
  return flt(multiplier * eligiblePayout);
}

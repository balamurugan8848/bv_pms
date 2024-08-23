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
  // Define the quarter tables
  const quarterTables = ["q1", "q2", "q3", "q4"];

  // Iterate over each quarter
  quarterTables.forEach(function (quarterKey) {
    let quarterTableField = `kra_kpi_mop_${quarterKey}`;
    let totalKpiWeightage = 0;
    let totalKraWeightage = 0;
    let previousKra = null;
    let isFirstRowOfKra = true;

    // Clear existing rows in the quarter table
    frm.clear_table(quarterTableField);

    kpisAndMops.forEach(function (item, index) {
      // Check if the item belongs to the current quarter or is not specified for any quarter
      if (item[quarterKey] || (!item.q1 && !item.q2 && !item.q3 && !item.q4)) {
        // Set the quarter checkbox
        frm.set_value(quarterKey, 1);

        // Add the "Total" row if the KRA changes
        if (previousKra && previousKra !== item.kra) {
          addTotalRow(
            frm,
            quarterTableField,
            totalKpiWeightage,
            totalKraWeightage
          );
          totalKpiWeightage = 0;
          totalKraWeightage = 0;
          isFirstRowOfKra = true; // Reset flag for the new KRA group
        }

        // Add row with KRA only for the first row of each KRA group
        addRowToQuarterTable(
          frm,
          item,
          quarterTableField,
          quarterKey,
          isFirstRowOfKra
        );

        // Accumulate weightages
        totalKpiWeightage += item.kpi_weightage || 0;
        totalKraWeightage += item.kra_weightage || 0;

        // Add the "Total" row if it’s the last item
        if (index === kpisAndMops.length - 1) {
          addTotalRow(
            frm,
            quarterTableField,
            totalKpiWeightage,
            totalKraWeightage
          );
        }

        // Update previous KRA and flag
        previousKra = item.kra;
        isFirstRowOfKra = false; // No longer the first row of the KRA group
      }
    });
  });

  // Refresh the fields to update the UI
  frm.refresh_fields();
}

function addRowToQuarterTable(frm, item, tableField, quarterKey, showKra) {
  let row = frm.add_child(tableField);
  row.kra = showKra ? item.kra : ""; // Show KRA only for the first row
  row.kpi = item.kpi;
  row.mop = item.mop;
  row.kpi_weightage = item.kpi_weightage;
  row.kra_weightage = item.kra_weightage;
  row.target_matrix = item[quarterKey];
}

function addTotalRow(frm, tableField, totalKpiWeightage, totalKraWeightage) {
  let row = frm.add_child(tableField);
  row.kra = ""; // Empty for total row
  row.kpi = ""; // No KPI for total row
  row.mop = "Total"; // Indicate this is a total row
  row.kpi_weightage = totalKpiWeightage; // Total KPI weightage
  row.kra_weightage = totalKraWeightage; // Total KRA weightage
  row.target_matrix = ""; // No target matrix for total row
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

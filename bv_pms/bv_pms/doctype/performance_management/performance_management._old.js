frappe.ui.form.on("Performance Management", {
  onload: function (frm) {
    // updateTotalKPIWeightage(frm);
    // updateOverallLOPRating(frm);
  },
  before_save: function (frm) {
    updateTotalKPIWeightage(frm);
    updateOverallLOPRating(frm);
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

    // Trigger total KPI weightage update
    updateTotalKPIWeightage(frm);

    // Ensure the child table is refreshed to display updated values
    frm.refresh_field("kra_kpi_mop_q1");
    frm.refresh_field("kra_kpi_mop_q2");
    frm.refresh_field("kra_kpi_mop_q3");
    frm.refresh_field("kra_kpi_mop_q4");
  },
  rating_score: function (frm, cdt, cdn) {
    updateOverallLOPRating(frm);
    frm.refresh_field("kra_kpi_mop_q1");
    frm.refresh_field("kra_kpi_mop_q2");
    frm.refresh_field("kra_kpi_mop_q3");
    frm.refresh_field("kra_kpi_mop_q4");
  },
  quarterly_lop_by_manager: function (frm, cdt, cdn) {
    let row = locals[cdt][cdn];
    updateRatingScore(frm, row);
    updateTotalKPIWeightage(frm);
    frm.refresh_field("kra_kpi_mop_q1");
    frm.refresh_field("kra_kpi_mop_q2");
    frm.refresh_field("kra_kpi_mop_q3");
    frm.refresh_field("kra_kpi_mop_q4");
  },
});

// Function to update total KPI weightage for a specific quarter
function updateTotalKPIWeightage(frm) {
  let totalWeightageQ1 = 0;
  let totalWeightageQ2 = 0;
  let totalWeightageQ3 = 0;
  let totalWeightageQ4 = 0;

  // Calculate total KPI weightage for each quarter
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

  // Update total KPI weightage fields
  frm.set_value("total_kpi_weightage_q1", totalWeightageQ1);
  frm.set_value("total_kpi_weightage_q2", totalWeightageQ2);
  frm.set_value("total_kpi_weightage_q3", totalWeightageQ3);
  frm.set_value("total_kpi_weightage_q4", totalWeightageQ4);
}

function updateOverallLOPRating(frm) {
  let totalRatingQ1 = 0;
  let totalRatingQ2 = 0;
  let totalRatingQ3 = 0;
  let totalRatingQ4 = 0;

  // Calculate total rating score for each quarter
  frm.doc.kra_kpi_mop_q1.forEach((row) => {
    totalRatingQ1 += flt(row.rating_score);
  });
  frm.doc.kra_kpi_mop_q2.forEach((row) => {
    totalRatingQ2 += flt(row.rating_score);
  });
  frm.doc.kra_kpi_mop_q3.forEach((row) => {
    totalRatingQ3 += flt(row.rating_score);
  });
  frm.doc.kra_kpi_mop_q4.forEach((row) => {
    totalRatingQ4 += flt(row.rating_score);
  });

  // Update overall LOP rating fields
  frm.set_value("overall_lop_rating_q1", totalRatingQ1);
  frm.set_value("overall_lop_rating_q2", totalRatingQ2);
  frm.set_value("overall_lop_rating_q3", totalRatingQ3);
  frm.set_value("overall_lop_rating_q4", totalRatingQ4);
}

function distributeToQuarterTables(frm, kpisAndMops) {
  let kraTracker = {
    q1: new Set(),
    q2: new Set(),
    q3: new Set(),
    q4: new Set(),
  };

  kpisAndMops.forEach(function (item) {
    let addToAllQuarters = !item.q1 && !item.q2 && !item.q3 && !item.q4;

    if (addToAllQuarters) {
      frm.set_value("q1", 1);
      frm.set_value("q2", 1);
      frm.set_value("q3", 1);
      frm.set_value("q4", 1);

      [
        "kra_kpi_mop_q1",
        "kra_kpi_mop_q2",
        "kra_kpi_mop_q3",
        "kra_kpi_mop_q4",
      ].forEach((tableField, index) => {
        addRowToQuarterTable(
          frm,
          item,
          tableField,
          `q${index + 1}`,
          kraTracker[`q${index + 1}`],
          true
        );
      });
    } else {
      // Process for individual quarters as before
      if (item.q1) {
        frm.set_value("q1", 1);
        addRowToQuarterTable(
          frm,
          item,
          "kra_kpi_mop_q1",
          "q1",
          kraTracker.q1,
          false
        );
      }
      if (item.q2) {
        frm.set_value("q2", 1);
        addRowToQuarterTable(
          frm,
          item,
          "kra_kpi_mop_q2",
          "q2",
          kraTracker.q2,
          false
        );
      }
      if (item.q3) {
        frm.set_value("q3", 1);
        addRowToQuarterTable(
          frm,
          item,
          "kra_kpi_mop_q3",
          "q3",
          kraTracker.q3,
          false
        );
      }
      if (item.q4) {
        frm.set_value("q4", 1);
        addRowToQuarterTable(
          frm,
          item,
          "kra_kpi_mop_q4",
          "q4",
          kraTracker.q4,
          false
        );
      }
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
  let existingKraRows = frm.doc[tableField].filter(
    (row) => row.kra === item.kra
  );

  if (existingKraRows.length === 0) {
    // Add a new row for this KRA
    let kraRow = frm.add_child(tableField);
    kraRow.kra = item.kra;
    kraRow.kpi = item.kpi;
    kraRow.mop = item.mop;
    kraRow.kpi_weightage = item.kpi_weightage;
    kraRow.target_matrix = addToAllQuarters
      ? item.target_matrix
      : item[quarterKey];
    kraTracker.add(item.kra);
  } else {
    // Check if this exact KPI already exists
    let existingKpiRow = existingKraRows.find((row) => row.kpi === item.kpi);
    if (!existingKpiRow) {
      // Add a new row for this KPI under the same KRA
      let newRow = frm.add_child(tableField);
      newRow.kra = ""; // Leave KRA blank to avoid duplication
      newRow.kpi = item.kpi;
      newRow.mop = item.mop;
      newRow.kpi_weightage = item.kpi_weightage;
      newRow.target_matrix = addToAllQuarters
        ? item.target_matrix
        : item[quarterKey];
    }
    // If KPI already exists, we don't need to do anything
  }
}

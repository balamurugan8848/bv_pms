frappe.ui.form.on("Performance Management", {
  onload: function (frm) {
    frm.script_manager.trigger("calculate_total_weightages", frm.doc);
  },
  before_save: function (frm) {
    if (
      !(
        frm.doc.q1 ||
        frm.doc.q2 ||
        frm.doc.q3 ||
        frm.doc.q4 ||
        frm.doc.full_year
      )
    ) {
      frappe.throw(
        "At least one quarter (Q1, Q2, Q3, Q4 or Full Year) must be selected to proceed."
      );
    }
    calculateTotalWeightages(frm);
  },

  // To handle the Import KRA Template FY button functionality
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

              frm.set_value("template_selected_fy", template.name);

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
              calculateTotalWeightages(frm);

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
  "kra_kpi_mop_q1.kpi_weightage": function (frm, cdt, cdn) {
    calculateTotalWeightages(frm);
  },
  "kra_kpi_mop_q2.kpi_weightage": function (frm, cdt, cdn) {
    calculateTotalWeightages(frm);
  },
  "kra_kpi_mop_q3.kpi_weightage": function (frm, cdt, cdn) {
    calculateTotalWeightages(frm);
  },
  "kra_kpi_mop_q4.kpi_weightage": function (frm, cdt, cdn) {
    calculateTotalWeightages(frm);
  },
});

function calculateTotalWeightages(frm) {
  let totalQ1 = 0,
    totalQ2 = 0,
    totalQ3 = 0,
    totalQ4 = 0;

  // Calculate total weightages for each quarter
  frm.doc.kra_kpi_mop_q1.forEach(function (row) {
    totalQ1 += row.kpi_weightage || 0;
  });
  frm.doc.kra_kpi_mop_q2.forEach(function (row) {
    totalQ2 += row.kpi_weightage || 0;
  });
  frm.doc.kra_kpi_mop_q3.forEach(function (row) {
    totalQ3 += row.kpi_weightage || 0;
  });
  frm.doc.kra_kpi_mop_q4.forEach(function (row) {
    totalQ4 += row.kpi_weightage || 0;
  });

  // Set the total weightage values
  frm.set_value("total_kra_weightage_q1", totalQ1);
  frm.set_value("total_kra_weightage_q2", totalQ2);
  frm.set_value("total_kra_weightage_q3", totalQ3);
  frm.set_value("total_kra_weightage_q4", totalQ4);
}
function distributeToQuarterTables(frm, kpisAndMops) {
  let kraTracker = {
    q1: {},
    q2: {},
    q3: {},
    q4: {},
  };

  kpisAndMops.forEach(function (item) {
    // Process for Q1
    if (item.q1) {
      frm.set_value("q1", 1); // Check the Q1 checkbox
      addRowToQuarterTable(frm, item, "kra_kpi_mop_q1", "q1", kraTracker.q1);
    }
    // Process for Q2
    if (item.q2) {
      frm.set_value("q2", 1); // Check the Q2 checkbox
      addRowToQuarterTable(frm, item, "kra_kpi_mop_q2", "q2", kraTracker.q2);
    }
    // Process for Q3
    if (item.q3) {
      frm.set_value("q3", 1); // Check the Q3 checkbox
      addRowToQuarterTable(frm, item, "kra_kpi_mop_q3", "q3", kraTracker.q3);
    }
    // Process for Q4
    if (item.q4) {
      frm.set_value("q4", 1); // Check the Q4 checkbox
      addRowToQuarterTable(frm, item, "kra_kpi_mop_q4", "q4", kraTracker.q4);
    }
  });
}

// Add row to the appropriate quarter table
function addRowToQuarterTable(frm, item, tableField, quarterKey, kraTracker) {
  let kraRow;

  if (!kraTracker[item.kra]) {
    // Add the KRA in the first row if it hasn't been added yet
    kraRow = frm.add_child(tableField);
    kraRow.kra = item.kra;
    kraRow.kpi = item.kpi;
    kraRow.mop = item.mop;
    kraRow.kpi_weightage = item.kpi_weightage;
    kraRow.target_matrix = item[quarterKey]; // Set the target matrix field with the quarter value
    kraTracker[item.kra] = kraRow;
  } else {
    // Add subsequent rows with empty KRA
    kraRow = frm.add_child(tableField);
    kraRow.kra = ""; // Empty to avoid duplication of KRA
    kraRow.kpi = item.kpi;
    kraRow.mop = item.mop;
    kraRow.kpi_weightage = item.kpi_weightage;
    kraRow.target_matrix = item[quarterKey]; // Set the target matrix field with the quarter value
  }
}

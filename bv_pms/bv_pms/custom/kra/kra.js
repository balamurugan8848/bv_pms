// Copyright (c) 2024, Balamurugan and contributors
// For license information, please see license.txt

frappe.ui.form.on("KRA", {
  refresh: function (frm) {
    updateTotalKRAWeightage(frm); // Calculate and update the total weightage on refresh

    // Add a custom button under a dropdown labeled "Create"
    frm.add_custom_button(
      __("Create Performance Sheet"),
      function () {
        createPerformanceManagement(frm);
      },
      __("Create")
    );
  },
  before_save: function (frm) {
    // Update the KRA name in the custom_kpi_and_mop table before saving
    frm.doc.custom_kpi_and_mop.forEach(function (row) {
      row.kra = frm.doc.title;
    });
    frm.refresh_field("custom_kpi_and_mop");
  },
  custom_kpi_and_mop_add: function (frm, cdt, cdn) {
    updateTotalKRAWeightage(frm); // Update total weightage when a new row is added
  },
  custom_kpi_and_mop_remove: function (frm, cdt, cdn) {
    updateTotalKRAWeightage(frm); // Update total weightage when a row is removed
  },
  custom_kpi_and_mop: function (frm) {
    updateTotalKRAWeightage(frm); // Update total weightage when any field in the table is changed
  },
});

function updateTotalKRAWeightage(frm) {
  let custom_total_kra_weightage = 0;

  // Calculate total KRA weightage
  frm.doc.custom_kpi_and_mop.forEach(function (row) {
    if (row.kpi_weightage) {
      custom_total_kra_weightage += flt(row.kpi_weightage);
    }
  });

  // Set the total KRA weightage in the parent doctype
  frm.set_value("custom_total_kra_weightage", custom_total_kra_weightage);
}

function createPerformanceManagement(frm) {
  frappe.new_doc(
    "Performance Management",
    {
      company: frm.doc.custom_company,
      financial_year: frm.doc.custom_financial_year,
    },
    function (new_doc) {
      frappe.set_route("Form", "Performance Management", new_doc.name);

      // Check if the quarter fields should be marked based on the existence of values in custom_kpi_and_mop
      let hasQ1Value = frm.doc.custom_kpi_and_mop.some((row) => row.q1);
      let hasQ2Value = frm.doc.custom_kpi_and_mop.some((row) => row.q2);
      let hasQ3Value = frm.doc.custom_kpi_and_mop.some((row) => row.q3);
      let hasQ4Value = frm.doc.custom_kpi_and_mop.some((row) => row.q4);

      if (hasQ1Value) {
        new_doc.q1 = 1;
        moveKPItoQuarter(frm, new_doc, "kra_kpi_mop_q1", "q1");
      }
      if (hasQ2Value) {
        new_doc.q2 = 1;
        moveKPItoQuarter(frm, new_doc, "kra_kpi_mop_q2", "q2");
      }
      if (hasQ3Value) {
        new_doc.q3 = 1;
        moveKPItoQuarter(frm, new_doc, "kra_kpi_mop_q3", "q3");
      }
      if (hasQ4Value) {
        new_doc.q4 = 1;
        moveKPItoQuarter(frm, new_doc, "kra_kpi_mop_q4", "q4");
      }

      frappe.model.save_doc(new_doc);
    }
  );
}

function moveKPItoQuarter(frm, new_doc, quarter_field, quarter_key) {
  // Group KPIs and MOPs by KRA
  let kra_groups = groupByKRA(frm.doc.custom_kpi_and_mop);

  for (let kra in kra_groups) {
    // Add KPI and MOP rows under the KRA
    kra_groups[kra].forEach(function (row, index) {
      if (row[quarter_key]) {
        // Only add rows if the specific quarter value exists
        let new_row = frappe.model.add_child(new_doc, quarter_field);

        if (index === 0) {
          // Add the KRA in the first row
          new_row.kra = kra;
        } else {
          new_row.kra = ""; // Leave empty to maintain proper structure for subsequent rows
        }

        new_row.kpi = row.kpi;
        new_row.mop = row.mop;
        new_row.kpi_weightage = row.kpi_weightage;
        new_row.target_matrix = row[quarter_key]; // Set the target matrix field with the quarter value
      }
    });
  }
}

// Helper function to group rows by KRA
function groupByKRA(rows) {
  return rows.reduce((groups, row) => {
    if (!groups[row.kra]) {
      groups[row.kra] = [];
    }
    groups[row.kra].push(row);
    return groups;
  }, {});
}

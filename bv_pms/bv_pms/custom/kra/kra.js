frappe.ui.form.on("KRA", {
  refresh: function (frm) {
    updateTotalKRAWeightage(frm); // Calculate and update the total weightage on refresh

    // Add a custom button under a dropdown labeled "Create"
    // frm.add_custom_button(
    //   __("Create Performance Sheet"),
    //   function () {
    //     createPerformanceManagement(frm);
    //   },
    //   __("Create")
    // );
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
  let totalKRAWeightage = 0;

  // Iterate through each row in the custom_kpi_and_mop table
  frm.doc.custom_kpi_and_mop.forEach(function (row) {
    if (row.kpi_weightage) {
      row.kra_weightage = row.kpi_weightage; // Set kra_weightage equal to kpi_weightage
      totalKRAWeightage += flt(row.kra_weightage); // Sum the kra_weightage
    }
  });

  frm.refresh_field("custom_kpi_and_mop"); // Refresh the table to reflect the changes

  // Set the total KRA weightage in the parent doctype
  frm.set_value("custom_total_kra_weightage", totalKRAWeightage);
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

      // Move KPI data to the appropriate quarter tables and check quarter boxes
      moveKPItoQuarter(frm, new_doc);

      frappe.model.save_doc(new_doc);
    }
  );
}

function moveKPItoQuarter(frm, new_doc) {
  // Group KPIs and MOPs by KRA
  let kra_groups = groupByKRA(frm.doc.custom_kpi_and_mop);

  for (let kra in kra_groups) {
    // Track if the KRA has any value for Q1, Q2, Q3, or Q4
    let addedToAnyQuarter = false;

    ["q1", "q2", "q3", "q4"].forEach(function (quarter) {
      let quarter_field = `kra_kpi_mop_${quarter}`;

      kra_groups[kra].forEach(function (row, index) {
        if (row[quarter]) {
          addedToAnyQuarter = true;

          let new_row = frappe.model.add_child(new_doc, quarter_field);
          if (index === 0) {
            new_row.kra = kra; // Add the KRA in the first row
          } else {
            new_row.kra = ""; // Leave empty for subsequent rows
          }

          new_row.kpi = row.kpi;
          new_row.mop = row.mop;
          new_row.kpi_weightage = row.kpi_weightage;
          new_row.target_matrix = row[quarter];
          new_row.kra_weightage = row.kra_weightage; // Add kra_weightage to the new doc

          // Mark the corresponding quarter checkbox
          new_doc[quarter] = 1;
        }
      });
    });

    // If KRA is not added to any quarter, add it to all quarters and check the boxes
    if (!addedToAnyQuarter) {
      ["q1", "q2", "q3", "q4"].forEach(function (quarter) {
        let quarter_field = `kra_kpi_mop_${quarter}`;
        let new_row = frappe.model.add_child(new_doc, quarter_field);

        new_row.kra = kra;
        new_row.kpi = kra_groups[kra][0].kpi;
        new_row.mop = kra_groups[kra][0].mop;
        new_row.kpi_weightage = kra_groups[kra][0].kpi_weightage;
        new_row.kra_weightage = kra_groups[kra][0].kra_weightage; // Add kra_weightage to the new doc

        // Mark the corresponding quarter checkbox
        new_doc[quarter] = 1;
      });
    }
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

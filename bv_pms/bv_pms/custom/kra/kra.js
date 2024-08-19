// Copyright (c) 2024, Balamurugan and contributors
// For license information, please see license.txt
frappe.ui.form.on("KRA", {
  refresh: function (frm) {
    let custom_total_kra_weightage = 0;

    // Calculate total KRA weightage
    frm.doc.custom_kpi_and_mop.forEach(function (row) {
      if (row.kpi_weightage) {
        custom_total_kra_weightage += flt(row.kpi_weightage);
      }
    });

    // Set the total KRA weightage in the parent doctype
    frm.set_value("custom_total_kra_weightage", custom_total_kra_weightage);

    // Add a custom button under a dropdown labeled "Create"
    frm.add_custom_button(
      __("Create Goal Sheet"),
      function () {
        createGoalSheet(frm);
      },
      __("Create")
    );

    frm.add_custom_button(
      __("Add This to Template"),
      function () {
        addToTemplate(frm);
      },
      __("Create")
    );
  },
});

function createGoalSheet(frm) {
  frappe.new_doc(
    "GOAL Sheet",
    {
      company: frm.doc.custom_company,
      financial_year: frm.doc.custom_financial_year,
    },
    function (new_doc) {
      frappe.set_route("Form", "GOAL Sheet", new_doc.name);
    }
  );
}

function addToTemplate(frm) {
  // Your logic for adding this to the template
  frappe.msgprint(__("This KRA has been added to the template."));
}

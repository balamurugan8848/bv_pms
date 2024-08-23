// Copyright (c) 2024, Balamurugan and contributors
// For license information, please see license.txt

frappe.ui.form.on("GOAL and KRA Template", {
  refresh: function (frm) {
    frm.fields_dict.kpis_and_mops.grid.add_custom_button(
      __("Update KPIs and MOPs"),
      function () {
        updateKPIsAndMOPs(frm);
      }
    );
    frm.fields_dict.employees.grid.add_custom_button(
      __("Create Performance Sheet"),
      function () {
        createPerformanceSheet(frm);
      }
    );
    frm.set_query("kra", "kras", function () {
      return {
        filters: {
          custom_department: frm.doc.department,
          custom_designation: frm.doc.designation,
        },
      };
    });
  },
  department: function (frm) {
    var department = frm.doc.department;
    frm.set_value("department_2", department);
  },
  designation: function (frm) {
    var designation = frm.doc.designation;
    frm.set_value("designation_2", designation);
  },
  get_employees: function (frm) {
    FetchEmployees(frm);
  },
});

// frappe.ui.form.on("GOAL and KRA Template", {
//   refresh: function (frm) {
//     frm.add_custom_button(__("Create Performance Sheets"), function () {
//       frappe.call({
//         method:
//           "bv_pms.bv_pms.doctype.goal_and_kra_template.goal_and_kra_template.create_performance_sheets",
//         args: {
//           docname: frm.doc.name,
//         },
//         callback: function (r) {
//           if (r.message) {
//             frappe.msgprint(
//               __("Performance Management Sheets have been created.")
//             );
//           }
//         },
//       });
//     });
//   },
// });

//   department: function (frm) {
//     frm.trigger("update_kra_filters");
//   },
//   designation: function (frm) {
//     frm.trigger("update_kra_filters");
//   },
//   update_kra_filters: function (frm) {
//     // Clear KRAs when department or designation changes
//     frm.clear_table("kras");
//     frm.refresh_field("kras");

//     // Clear KPIs and MOPs
//     frm.clear_table("kpis_and_mops");
//     frm.refresh_field("kpis_and_mops");
//   },
// });

// frappe.ui.form.on("KRAs", {
//   kra: function (frm, cdt, cdn) {
//     let row = locals[cdt][cdn];
//     if (row.kra) {
//       fetchKPIsAndMOPs(frm, row);
//     }
//   },
//   kras_remove: function (frm, cdt, cdn) {
//     removeRelatedKPIsAndMOPs(frm);
//   },
// });
function updateKPIsAndMOPs(frm) {
  frm.clear_table("kpis_and_mops");

  function processKRAs(index) {
    if (index >= frm.doc.kras.length) {
      frm.refresh_field("kpis_and_mops");
      return;
    }

    let kra_row = frm.doc.kras[index];
    if (kra_row.kra) {
      frappe.call({
        method: "frappe.client.get",
        args: {
          doctype: "KRA",
          name: kra_row.kra,
        },
        callback: function (response) {
          if (response.message) {
            let kra_doc = response.message;
            if (
              kra_doc.custom_kpi_and_mop &&
              kra_doc.custom_kpi_and_mop.length
            ) {
              kra_doc.custom_kpi_and_mop.forEach(function (kpi_mop) {
                let new_row = frm.add_child("kpis_and_mops");
                new_row.kra = kra_row.kra;
                new_row.kpi = kpi_mop.kpi;
                new_row.mop = kpi_mop.mop;
                new_row.kpi_weightage = kpi_mop.kpi_weightage;
                new_row.kra_weightage = kpi_mop.kra_weightage;
                new_row.q1 = kpi_mop.q1;
                new_row.q2 = kpi_mop.q2;
                new_row.q3 = kpi_mop.q3;
                new_row.q4 = kpi_mop.q4;
              });
            }
          }
          processKRAs(index + 1);
        },
      });
    } else {
      processKRAs(index + 1);
    }
  }

  processKRAs(0);
}

function FetchEmployees(frm) {
  if (frm.doc.department_2 && frm.doc.designation_2) {
    frappe.call({
      method: "frappe.client.get_list",
      args: {
        doctype: "Employee",
        filters: {
          department: frm.doc.department_2,
          designation: frm.doc.designation_2,
        },
        fields: ["name", "employee_name", "department", "designation"],
      },
      callback: function (r) {
        if (r.message) {
          frm.clear_table("employees");
          r.message.forEach(function (employee) {
            var row = frm.add_child("employees");
            row.employee = employee.name;
            row.employee_name = employee.employee_name;
            row.department = employee.department;
            row.designation = employee.designation;
          });
          frm.refresh_field("employees");
        } else {
          frappe.msgprint(
            __(
              "No employees found for the selected department and designation."
            )
          );
        }
      },
    });
  } else {
    frappe.msgprint(__("Please enter both Department and Designation."));
  }
}

function createPerformanceSheet(frm) {
  frappe.confirm(
    "Do you want to create a Performance Management Sheet for the selected employees?",
    function () {
      frm.doc.employees.forEach(function (employee) {
        let doc = {
          doctype: "Performance Management",
          employee_token_id: employee.employee,
          employee_name: employee.employee_name,
          department: employee.department,
          designation: employee.designation,
          kras: frm.doc.kras.map((kra) => ({
            kra: kra.kra,
            total_kra_weightage: kra.weightage,
          })),
        };

        // Initialize quarter-specific fields
        doc.q1 = 0;
        doc.q2 = 0;
        doc.q3 = 0;
        doc.q4 = 0;
        doc.kra_kpi_mop_q1 = [];
        doc.kra_kpi_mop_q2 = [];
        doc.kra_kpi_mop_q3 = [];
        doc.kra_kpi_mop_q4 = [];

        // Distribute to quarter tables
        distributeToQuarterTables(doc, frm.doc.kpis_and_mops);

        frappe.call({
          method: "frappe.client.insert",
          args: { doc: doc },
          callback: function (r) {
            if (r.message) {
              frappe.msgprint(
                __(
                  "Performance Management Sheet created for " +
                    employee.employee_name
                )
              );
            }
          },
        });
      });
    }
  );
}

function distributeToQuarterTables(doc, kpisAndMops) {
  ["q1", "q2", "q3", "q4"].forEach(function (quarterKey) {
    let quarterTable = `kra_kpi_mop_${quarterKey}`;
    let totalKpiWeightage = 0;
    let totalKraWeightage = 0;
    let previousKra = null;
    let isFirstKraRow = true; // Flag to track the first row of each KRA

    kpisAndMops.forEach(function (item, index) {
      // Process for the specific quarter or all quarters if none selected
      if (item[quarterKey] || (!item.q1 && !item.q2 && !item.q3 && !item.q4)) {
        doc[quarterKey] = 1;

        // If the KRA changes, add the "Total" row and reset the flag
        if (previousKra && previousKra !== item.kra) {
          addTotalRow(doc, quarterTable, totalKpiWeightage, totalKraWeightage);
          totalKpiWeightage = 0;
          totalKraWeightage = 0;
          isFirstKraRow = true; // Reset flag for the new KRA group
        }

        // Add the current row with KRA only for the first row of this KRA group
        addRowToQuarterTable(
          doc,
          item,
          quarterTable,
          quarterKey,
          isFirstKraRow
        );

        // Accumulate weightages for the "Total" row
        totalKpiWeightage += item.kpi_weightage || 0;
        totalKraWeightage += item.kra_weightage || 0;

        // If it's the last item, also add the "Total" row
        if (index === kpisAndMops.length - 1) {
          addTotalRow(doc, quarterTable, totalKpiWeightage, totalKraWeightage);
        }

        // Update the previous KRA and flag
        previousKra = item.kra;
        isFirstKraRow = false; // Only the first row will show the KRA
      }
    });
  });
}

function addRowToQuarterTable(doc, item, tableField, quarterKey, showKra) {
  doc[tableField].push({
    kra: showKra ? item.kra : "", // Show KRA only for the first row of each group
    kpi: item.kpi,
    mop: item.mop,
    kpi_weightage: item.kpi_weightage,
    kra_weightage: item.kra_weightage,
    target_matrix: item[quarterKey],
  });
}

function addTotalRow(doc, tableField, totalKpiWeightage, totalKraWeightage) {
  doc[tableField].push({
    kra: "", // Empty to indicate it's a total row
    kpi: "", // No KPI
    mop: "Total", // Indicate this is a total row
    kpi_weightage: totalKpiWeightage, // Display the total KPI weightage
    kra_weightage: totalKraWeightage, // Display the total KRA weightage
    target_matrix: "", // No target matrix for this row
  });
}

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
        frappe.call({
          method:
            "bv_pms.bv_pms.doctype.goal_and_kra_template.goal_and_kra_template.create_performance_sheets",
          args: {
            docname: frm.doc.name,
          },
          callback: function (r) {
            if (r.message) {
              frappe.msgprint(
                __("Performance Management Sheets have been created.")
              );
            }
          },
        });
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
  after_save: function (frm) {
    if (frm.doc.employees && frm.doc.employees.length > 0) {
      frappe.confirm(
        "Do you want to create a Performance Management Sheet for the selected employees?",
        function () {
          // If the user clicks "Yes"
          frm.save(); // Proceed with saving the document
          createPerformanceManagementSheet(frm); // Call the function to create the sheets
        },
        function () {
          // If the user clicks "No"
          frappe.msgprint("The document was not saved.");
          frappe.validated = false; // Prevent saving the document
        }
      );
    }
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
  frm.refresh_field("kpis_and_mops");

  frm.doc.kras.forEach(function (kra_row) {
    if (kra_row.kra) {
      fetchKPIsAndMOPs(frm, kra_row);
    }
  });
}

function updateKPIsAndMOPs(frm) {
  let existingKPIsAndMOPs = frm.doc.kpis_and_mops || [];
  frm.clear_table("kpis_and_mops");

  frm.doc.kras.forEach(function (kra_row) {
    if (kra_row.kra) {
      // Find existing KPIs and MOPs for this KRA
      let existingForKRA = existingKPIsAndMOPs.filter(
        (row) => row.kra === kra_row.kra
      );
      if (existingForKRA.length > 0) {
        // If existing, add them back in the same order
        existingForKRA.forEach((row) => {
          frm.add_child("kpis_and_mops", row);
        });
      } else {
        // If not existing, fetch new ones
        fetchKPIsAndMOPs(frm, kra_row);
      }
    }
  });

  frm.refresh_field("kpis_and_mops");
}

function fetchKPIsAndMOPs(frm, kra_row) {
  frappe.call({
    method: "frappe.client.get",
    args: {
      doctype: "KRA",
      name: kra_row.kra,
    },
    callback: function (response) {
      if (response.message) {
        let kra_doc = response.message;
        if (kra_doc.custom_kpi_and_mop && kra_doc.custom_kpi_and_mop.length) {
          kra_doc.custom_kpi_and_mop.forEach(function (kpi_mop) {
            let new_row = frm.add_child("kpis_and_mops");
            new_row.kra = kra_row.kra;
            new_row.kpi = kpi_mop.kpi;
            new_row.mop = kpi_mop.mop;
            new_row.kpi_weightage = kpi_mop.kpi_weightage;
            new_row.q1 = kpi_mop.q1;
            new_row.q2 = kpi_mop.q2;
            new_row.q3 = kpi_mop.q3;
            new_row.q4 = kpi_mop.q4;
          });
          frm.refresh_field("kpis_and_mops");
        } else {
          frappe.msgprint(
            __(`No custom KPIs and MOPs found for KRA: ${kra_row.kra}`)
          );
        }
      } else {
        frappe.msgprint(__(`KRA ${kra_row.kra} not found`));
      }
    },
  });
}

function removeRelatedKPIsAndMOPs(frm) {
  let kras_set = new Set(frm.doc.kras.map((row) => row.kra));
  frm.doc.kpis_and_mops = frm.doc.kpis_and_mops.filter((row) =>
    kras_set.has(row.kra)
  );
  frm.refresh_field("kpis_and_mops");
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
          // Clear existing rows in the employee_details table
          frm.clear_table("employees");

          // Loop through the fetched employees and add them to the child table
          r.message.forEach(function (employee) {
            var row = frm.add_child("employees");
            row.employee = employee.name;
            row.employee_name = employee.employee_name;
            row.department = employee.department;
            row.designation = employee.designation;
          });

          // Refresh the employee_details field to display the changes
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

// function createPerformanceSheet(frm) {
//   frappe.confirm(
//     "Do you want to create a Performance Management Sheet for the selected employees?",
//     function () {
//       // Loop through each employee in the `employees` table
//       frm.doc.employees.forEach(function (employee) {
//         // Create a new Performance Management Sheet
//         frappe.call({
//           method: "frappe.client.insert",
//           args: {
//             doc: {
//               doctype: "Performance Management Sheet",
//               employee: employee.employee,
//               employee_name: employee.employee_name,
//               department: employee.department,
//               designation: employee.designation,
//               kras: frm.doc.kras.map((kra) => ({
//                 kra: kra.kra,
//                 total_kra_weightage: kra.weightage,
//               })),
//               kpis_and_mops: frm.doc.kpis_and_mops.map((kpi) => ({
//                 kpi: kpi.kpi,
//                 mop: kpi.mop,
//                 kpi_weightage: kpi.kpi_weightage,
//                 q1: kpi.q1,
//                 q2: kpi.q2,
//                 q3: kpi.q3,
//                 q4: kpi.q4,
//               })),
//             },
//           },
//           callback: function (r) {
//             if (r.message) {
//               frappe.msgprint(
//                 __(
//                   "Performance Management Sheet created for " +
//                     employee.employee_name
//                 )
//               );
//             }
//           },
//         });
//       });
//     }
//   );
// }

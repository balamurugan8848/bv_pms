// Copyright (c) 2024, Balamurugan and contributors
// For license information, please see license.txt

frappe.ui.form.on("Performance Management Sheet", {
  // onload: function (frm) {
  //   // Set the financial year during the setup
  //   frappe.call({
  //     method: "frappe.client.get_list",
  //     args: {
  //       doctype: "Fiscal Year",
  //       filters: {},
  //       fields: ["name"],
  //       order_by: "name desc",
  //       limit: 1,
  //     },
  //     callback: function (r) {
  //       if (r.message && r.message.length > 0) {
  //         frm.set_value("financial_year", r.message[0].name);
  //       }
  //     },
  //   });

  //   // Set up the query for the KRA field in the child table
  //   frm.fields_dict["kras"].grid.get_field("kra").get_query = function (
  //     doc,
  //     cdt,
  //     cdn
  //   ) {
  //     var child = locals[cdt][cdn];
  //     return {
  //       filters: {
  //         custom_department: child.department,
  //       },
  //     };
  //   };
  // },
  refresh: function (frm) {
    frm.fields_dict.kpis_and_mops.grid.add_custom_button(
      __("Update KPIs and MOPs"),
      function () {
        updateKPIsAndMOPs(frm);
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
    frm.trigger("update_kra_filters");
  },
  designation: function (frm) {
    frm.trigger("update_kra_filters");
  },
  update_kra_filters: function (frm) {
    // Clear KRAs when department or designation changes
    frm.clear_table("kras");
    frm.refresh_field("kras");

    // Clear KPIs and MOPs
    frm.clear_table("kpis_and_mops");
    frm.refresh_field("kpis_and_mops");
  },
  employee: function (frm) {
    var employee = frm.doc.employee;
    frm.set_value("employee_name", employee);
  },
  import_kra_from_template: function (frm) {
    new frappe.ui.form.MultiSelectDialog({
      doctype: "GOAL and KRA Template",
      target: frm,
      setters: {
        department: frm.doc.department,
        designation: frm.doc.designation,
        // financial_year: frm.doc.financial_year,
      },
      get_query: function () {
        return {
          filters: {
            department: frm.doc.department,
            designation: frm.doc.designation,
            // financial_year: frm.doc.financial_year,
          },
        };
      },
      action: function (selections) {
        // Fetch the selected GOAL and KRA Template
        frappe.call({
          method: "frappe.client.get",
          args: {
            doctype: "GOAL and KRA Template",
            name: selections[0], // Assuming single selection for simplicity
          },
          callback: function (r) {
            if (r.message) {
              var template = r.message;

              frm.set_value("goal_kra_template_selected", template.name);

              // Clear existing KRAs
              frm.clear_table("kras");

              // Clear existing KPIs and MOPs
              frm.clear_table("kpis_and_mops");

              // Loop through the template's KRAs and KPIs/MOPs
              template.kras.forEach(function (kra) {
                var kra_row = frm.add_child("kras");
                kra_row.kra = kra.kra;
                kra_row.total_kra_weightage = kra.weightage;

                // Initialize the flag to ensure the KRA is set in the first row only
                let isFirstRow = true;

                // Loop through the KPIs and MOPs for this KRA
                template.kpis_and_mops.forEach(function (item) {
                  if (item.kra === kra.kra) {
                    var kpi_row = frm.add_child("kpis_and_mops");
                    kpi_row.kra = isFirstRow ? kra.kra : "";
                    kpi_row.kpi = item.kpi;
                    kpi_row.mop = item.mop;
                    kpi_row.kpi_weightage = item.kpi_weightage;
                    kpi_row.q1 = item.q1;
                    kpi_row.q2 = item.q2;
                    kpi_row.q3 = item.q3;
                    kpi_row.q4 = item.q4;
                    isFirstRow = false; // Subsequent rows will not set KRA
                  }
                });
              });

              // Refresh the fields
              frm.refresh_field("kras");
              frm.refresh_field("kpis_and_mops");

              cur_dialog.hide();
            }
          },
        });
      },
    });
  },
});

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
          let isFirstRow = true;
          kra_doc.custom_kpi_and_mop.forEach(function (kpi_mop) {
            let new_row = frm.add_child("kpis_and_mops");
            new_row.kra = isFirstRow ? kra_row.kra : ""; // Set KRA only for the first row
            new_row.kpi = kpi_mop.kpi;
            new_row.mop = kpi_mop.mop;
            new_row.kpi_weightage = kpi_mop.kpi_weightage;
            new_row.q1 = kpi_mop.q1;
            new_row.q2 = kpi_mop.q2;
            new_row.q3 = kpi_mop.q3;
            new_row.q4 = kpi_mop.q4;

            isFirstRow = false; // Subsequent rows will not set KRA
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

//   refresh: function (frm) {
//     if (frm.doc.employee) {
//       frappe.call({
//         method: "frappe.client.get",
//         args: {
//           doctype: "Employee",
//           name: frm.doc.employee,
//         },
//         callback: function (r) {
//           if (r.message) {
//             let employee_data = r.message;
//             let employee_name = employee_data.employee_name || "";
//             let department_2 = employee_data.department || "";
//             let cost_centre = employee_data.cost_centre || "";
//             let date_of_joining = employee_data.date_of_joining || "";
//             let working_location = employee_data.working_location || "";
//             let designation = employee_data.designation || "";
//             let group = employee_data.custom_group || "";
//             let grade = employee_data.grade || "";
//             let appraiser_name = employee_data.custom_appraiser_name || "";
//             let reviewer_name = employee_data.custom_reviewer_name || "";
//             let admin_reporting =
//               employee_data.custom_administrative_reporting || "";
//             let functional_reporting =
//               employee_data.custom_functional_reporting || "";

//             // Build the HTML content
//             let html = `
//                         <table border="1" cellpadding="5" cellspacing="0" style="width: 100%;">
//                             <tr>
//                                 <th colspan="26">KRA - GOAL SHEET - (FY:2024-2025)</th>
//                             </tr>
//                             <tr>
//                                 <td colspan="4">Employee's Name:</td>
//                                 <td colspan="4">${employee_name}</td>
//                                 <td colspan="3">Emp Token Id:</td>
//                                 <td colspan="3">${frm.doc.employee}</td>
//                                 <td colspan="3">Cost Centre:</td>
//                                 <td colspan="9">${cost_centre}</td>
//                             </tr>
//                             <tr>
//                                 <td colspan="4">Department:</td>
//                                 <td colspan="4">${department_2}</td>
//                                 <td colspan="3">Date of Joining:</td>
//                                 <td colspan="3">${date_of_joining}</td>
//                                 <td colspan="3">Working Location:</td>
//                                 <td colspan="9">${working_location}</td>
//                             </tr>
//                             <tr>
//                                 <td colspan="4">Group:</td>
//                                 <td colspan="4">${group}</td>
//                                 <td colspan="3">Designation:</td>
//                                 <td colspan="3">${designation}</td>
//                                 <td colspan="3">Administrative Reporting:</td>
//                                 <td colspan="9">${admin_reporting}</td>
//                             </tr>
//                             <tr>
//                                 <td colspan="4">Category:</td>
//                                 <td colspan="4">${frm.doc.category}</td>
//                                 <td colspan="3">Grade:</td>
//                                 <td colspan="3">${grade}</td>
//                                 <td colspan="3">Functional Reporting:</td>
//                                 <td colspan="9">${functional_reporting}</td>
//                             </tr>
//                             <tr>
//                                 <td colspan="4">Appraisal Period:</td>
//                                 <td colspan="4">${frm.doc.appraisal_period}</td>
//                                 <td colspan="3">Reporting Manager/Appraiser Name:</td>
//                                 <td colspan="3">${appraiser_name}</td>
//                                 <td colspan="3">HOD/Reviewer Name:</td>
//                                 <td colspan="9">${reviewer_name}</td>
//                             </tr>
//                             <tr>
//                             <td colspan="2">Sr.No</td>
//                             <td colspan="2">Company</td>
//                             <td colspan="2">KRA/Goals</td>
//                             <td colspan="2">KPI</td>
//                             <td colspan="2">MOP</td>
//                             <td colspan="2">KPI Weightage</td>
//                             <td colspan="2">KRA Weightage</td>
//                             <td colspan="12">
//                             <table border="1" cellpadding="5" cellspacing="0" style="width: 100%;">
//                                 <tr>
//                                     <th colspan="26">Performance Matrix</th>
//                                 </tr>
//                                 <tr>
//                                     <td colspan="14"></td>
//                                     <td colspan="5">E</td>
//                                     <td colspan="5">VG</td>
//                                     <td colspan="5">G</td>
//                                     <td colspan="5">M</td>
//                                     <td colspan="5">MI</td>
//                                 </tr>
//                                 <tr>
//                                     <td colspan="14"></td>
//                                     <td colspan="5">>100%</td>
//                                     <td colspan="5">91%-99%</td>
//                                     <td colspan="5">76%-90%</td>
//                                     <td colspan="5">61%-75%</td>
//                                     <td colspan="5"><60%</td>
//                                 </tr>
//                                 <tr>
//                                     <td colspan="14"></td>
//                                     <td colspan="5">130%</td>
//                                     <td colspan="5">100%</td>
//                                     <td colspan="5">75%</td>
//                                     <td colspan="5">45%</td>
//                                     <td colspan="5">0%</td>
//                                 </tr>
//                                 <tr>
//                                     <td colspan="14"></td>
//                                     <td colspan="5">L5</td>
//                                     <td colspan="5">L4</td>
//                                     <td colspan="5">L3</td>
//                                     <td colspan="5">L2</td>
//                                     <td colspan="5">L1</td>
//                                 </tr>
//                             </table>
//                         </td>
//                     </tr>
//                     <tr>
//                                 <td colspan="26">
//                                     <div>Signature of Employee: _______________</div>
//                                     <div>Signature of Appraiser/Reporting Manager: _______________</div>
//                                     <div>Signature of Reviewer: _______________</div>
//                                     <div>Signature of HR: _______________ Document Received by HR on: _______________</div>
//                                 </td>
//                             </tr>
//                         </table>`;

//             // Set the HTML content in the field
//             frm.fields_dict["kra_goal_sheet"].html(html);
//           }
//         },
//       });
//     }
//   },
// });

// onload: function (frm) {
//     if (frm.doc.employee) {
//       frappe.call({
//         method: "frappe.client.get",
//         args: {
//           doctype: "Employee",
//           name: frm.doc.employee,
//         },
//         callback: function (r) {
//           if (r.message) {
//             let employee_data = r.message;
//             // ... (keep the existing code for employee details)

//             // Start building the HTML content
//             let html = `
//           <table border="1" cellpadding="5" cellspacing="0" style="width: 100%;">
//             <!-- ... (keep the existing header rows) -->
//           </table>`;

//             // Create a new table for KRAs, KPIs, and MOPs
//             html += `
//           <table id="kraTable" border="1" cellpadding="5" cellspacing="0" style="width: 100%;">
//             <tr>
//               <th>Sr.No</th>
//               <th>KRA/Goals</th>
//               <th>KPI</th>
//               <th>MOP</th>
//               <th>KPI Weightage</th>
//               <th>Total KRA Weightage</th>
//             </tr>`;

//             let kra_index = 1;
//             let kra_promises = frm.doc.kras.map((kra) => {
//               return new Promise((resolve) => {
//                 frappe.call({
//                   method: "frappe.client.get",
//                   args: {
//                     doctype: "KRA",
//                     name: kra.kra,
//                   },
//                   callback: function (result) {
//                     if (result.message) {
//                       let kra_doc = result.message;
//                       let kpi_and_mops = kra_doc.custom_kpi_and_mop || [];
//                       let kra_rows = "";

//                       kpi_and_mops.forEach((item, kpiIndex) => {
//                         kra_rows += `
//                       <tr>
//                         ${
//                           kpiIndex === 0
//                             ? `<td rowspan="${kpi_and_mops.length}">${kra_index}</td>`
//                             : ""
//                         }
//                         ${
//                           kpiIndex === 0
//                             ? `<td rowspan="${kpi_and_mops.length}">${kra.kra}</td>`
//                             : ""
//                         }
//                         <td contenteditable="true">${item.kpi || ""}</td>
//                         <td contenteditable="true">${item.mop || ""}</td>
//                         <td contenteditable="true">${
//                           item.kpi_weightage || ""
//                         }</td>
//                         ${
//                           kpiIndex === 0
//                             ? `<td rowspan="${
//                                 kpi_and_mops.length
//                               }" contenteditable="true">${
//                                 kra_doc.custom_total_kra_weightage || ""
//                               }</td>`
//                             : ""
//                         }
//                       </tr>`;
//                       });

//                       // If there are no KPIs and MOPs, create a single row
//                       if (kpi_and_mops.length === 0) {
//                         kra_rows = `
//                       <tr>
//                         <td>${kra_index}</td>
//                         <td>${kra.kra}</td>
//                         <td contenteditable="true"></td>
//                         <td contenteditable="true"></td>
//                         <td contenteditable="true"></td>
//                         <td contenteditable="true">${
//                           kra_doc.custom_total_kra_weightage || ""
//                         }</td>
//                       </tr>`;
//                       }

//                       resolve({ index: kra_index, rows: kra_rows });
//                       kra_index++;
//                     } else {
//                       resolve({ index: kra_index, rows: "" });
//                       kra_index++;
//                     }
//                   },
//                 });
//               });
//             });

//             Promise.all(kra_promises).then((results) => {
//               results.sort((a, b) => a.index - b.index);
//               html += results.map((result) => result.rows).join("");
//               html += "</table>";
//               frm.fields_dict["kra_goal_sheet"].html(html);

//               // Add event listener for contenteditable cells
//               $('#kraTable td[contenteditable="true"]').on("blur", function () {
//                 // This function will be called when an editable cell loses focus
//                 // You can add logic here to update the data if needed
//                 console.log("Cell edited:", $(this).text());
//               });
//             });
//           }
//         },
//       });
//     }
//   },
// });

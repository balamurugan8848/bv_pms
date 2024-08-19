frappe.ui.form.on("Performance Evaluation", {
  onload: function (frm) {
    // Load the saved table state if it exists
    if (frm.doc.kpi_and_mops_html) {
      frm.fields_dict["kpi_and_mops"].html(frm.doc.kpi_and_mops_html);
      addEditableEventListeners(frm);
    }
  },

  fetch_kpis_and_mops: function (frm) {
    if (frm.doc.employee) {
      frappe.call({
        method: "frappe.client.get",
        args: {
          doctype: "Employee",
          name: frm.doc.employee,
        },
        callback: function (r) {
          if (r.message) {
            let html = generateTable(frm);
            frm.fields_dict["kpi_and_mops"].html(html);

            // Save the generated HTML to a hidden field
            frm.set_value("kpi_and_mops_html", html);
            addEditableEventListeners(frm);
          }
        },
      });
    }
  },
});

function generateTable(frm) {
  let html = `
    <table id="kraTable" border="1" cellpadding="5" cellspacing="0" style="width: 100%; table-layout: fixed; word-wrap: break-word; border-color: #cccccc;">
      <thead>
        <tr>
          <th rowspan="5" style="width: 5%; background-color: #f3f3f3; font-weight: normal; color: #7C7E80;">Sr.No</th>
          <th rowspan="5" style="width: 20%; background-color: #f3f3f3; font-weight: normal; color: #7C7E80;">KRA/Goals</th>
          <th rowspan="5" style="width: 20%; background-color: #f3f3f3; font-weight: normal; color: #7C7E80;">KPI</th>
          <th rowspan="5" style="width: 25%; background-color: #f3f3f3; font-weight: normal; color: #7C7E80;">MOP</th>
          <th rowspan="5" style="width: 15%; background-color: #f3f3f3; font-weight: normal; color: #7C7E80;">KPI Weightage</th>
          <th rowspan="5" style="width: 15%; background-color: #f3f3f3; font-weight: normal; color: #7C7E80;">Total KRA Weightage</th>
        </tr>
        <tr>
          <th colspan="5" style="background-color: #f3f3f3; font-weight: normal; color: #7C7E80; text-align: center;">Performance Matrix</th>
        </tr>
        <tr>
          <th style="background-color: #f3f3f3; font-weight: normal; color: #7C7E80;">E</th>
          <th style="background-color: #f3f3f3; font-weight: normal; color: #7C7E80;">VG</th>
          <th style="background-color: #f3f3f3; font-weight: normal; color: #7C7E80;">G</th>
          <th style="background-color: #f3f3f3; font-weight: normal; color: #7C7E80;">M</th>
          <th style="background-color: #f3f3f3; font-weight: normal; color: #7C7E80;">MI</th>
        </tr>
        <tr>
          <th style="background-color: #f3f3f3; font-weight: normal; color: #7C7E80;">>100%</th>
          <th style="background-color: #f3f3f3; font-weight: normal; color: #7C7E80;">91%-99%</th>
          <th style="background-color: #f3f3f3; font-weight: normal; color: #7C7E80;">76%-90%</th>
          <th style="background-color: #f3f3f3; font-weight: normal; color: #7C7E80;">62%-75%</th>
          <th style="background-color: #f3f3f3; font-weight: normal; color: #7C7E80;">&lt;60%</th>
        </tr>
        <tr>
          <th style="background-color: #f3f3f3; font-weight: normal; color: #7C7E80;">130%</th>
          <th style="background-color: #f3f3f3; font-weight: normal; color: #7C7E80;">100%</th>
          <th style="background-color: #f3f3f3; font-weight: normal; color: #7C7E80;">75%</th>
          <th style="background-color: #f3f3f3; font-weight: normal; color: #7C7E80;">45%</th>
          <th style="background-color: #f3f3f3; font-weight: normal; color: #7C7E80;">0%</th>
        </tr>
        <tr>
          <th style="background-color: #f3f3f3; font-weight: normal; color: #7C7E80;">L5</th>
          <th style="background-color: #f3f3f3; font-weight: normal; color: #7C7E80;">L4</th>
          <th style="background-color: #f3f3f3; font-weight: normal; color: #7C7E80;">L3</th>
          <th style="background-color: #f3f3f3; font-weight: normal; color: #7C7E80;">L2</th>
          <th style="background-color: #f3f3f3; font-weight: normal; color: #7C7E80;">L1</th>
        </tr>
      </thead>
      <tbody>`;

  // Logic to add rows of data here

  let kra_index = 1;
  let kra_promises = frm.doc.kras.map((kra) => {
    return new Promise((resolve) => {
      frappe.call({
        method: "frappe.client.get",
        args: {
          doctype: "KRA",
          name: kra.kra,
        },
        callback: function (result) {
          if (result.message) {
            let kra_doc = result.message;
            let kpi_and_mops = kra_doc.custom_kpi_and_mop || [];
            let kra_rows = "";

            kpi_and_mops.forEach((item, kpiIndex) => {
              kra_rows += `
              <tr data-kra="${kra.kra}" data-kpi="${item.kpi}">
                ${
                  kpiIndex === 0
                    ? `<td rowspan="${kpi_and_mops.length}">${kra_index}</td>`
                    : ""
                }
                ${
                  kpiIndex === 0
                    ? `<td rowspan="${kpi_and_mops.length}" style="word-wrap: break-word;">${kra.kra}</td>`
                    : ""
                }
                <td contenteditable="true" class="kpi" style="word-wrap: break-word;">${
                  item.kpi || ""
                }</td>
                <td contenteditable="true" class="mop" style="word-wrap: break-word;">${
                  item.mop || ""
                }</td>
                <td contenteditable="true" class="kpi-weightage" style="word-wrap: break-word;">${
                  item.kpi_weightage || ""
                }</td>
                ${
                  kpiIndex === 0
                    ? `<td rowspan="${
                        kpi_and_mops.length
                      }" class="total-kra-weightage" style="word-wrap: break-word;" ${
                        frappe.user.has_role("BV-HR-Manager")
                          ? 'contenteditable="true"'
                          : ""
                      }>${kra_doc.custom_total_kra_weightage || ""}</td>`
                    : ""
                }
              </tr>`;
            });

            // If there are no KPIs and MOPs, create a single row
            if (kpi_and_mops.length === 0) {
              kra_rows = `
              <tr data-kra="${kra.kra}">
                <td>${kra_index}</td>
                <td style="word-wrap: break-word;">${kra.kra}</td>
                <td contenteditable="true" class="kpi" style="word-wrap: break-word;"></td>
                <td contenteditable="true" class="mop" style="word-wrap: break-word;"></td>
                <td contenteditable="true" class="kpi-weightage" style="word-wrap: break-word;"></td>
                <td class="total-kra-weightage" style="word-wrap: break-word;" ${
                  frappe.user.has_role("BV-HR-Manager")
                    ? 'contenteditable="true"'
                    : ""
                }>${kra_doc.custom_total_kra_weightage || ""}</td>
              </tr>`;
            }

            resolve({
              index: kra_index,
              kra: kra.kra,
              rows: kra_rows,
            });
            kra_index++;
          } else {
            resolve({ index: kra_index, kra: kra.kra, rows: "" });
            kra_index++;
          }
        },
      });
    });
  });

  Promise.all(kra_promises).then((results) => {
    // Sort results based on the order of KRAs in frm.doc.kras
    results.sort((a, b) => {
      return (
        frm.doc.kras.findIndex((k) => k.kra === a.kra) -
        frm.doc.kras.findIndex((k) => k.kra === b.kra)
      );
    });
    html += results.map((result) => result.rows).join("");
    html += "</tbody></table>";
    frm.fields_dict["kpi_and_mops"].html(html);

    // Save the generated HTML to a hidden field
    frm.set_value("kpi_and_mops_html", html);
    addEditableEventListeners(frm);
  });

  return html;
}

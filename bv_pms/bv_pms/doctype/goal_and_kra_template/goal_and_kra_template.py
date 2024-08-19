# Copyright (c) 2024, Balamurugan and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class GOALandKRATemplate(Document):
	pass


import frappe
from frappe import _

# @frappe.whitelist()
# def update_kpis_and_mops(doc_name):
#     frappe.logger().info(f"Received doc_name: {doc_name}")
#     try:
#         doc = frappe.get_doc("GOAL and KRA Template", doc_name)
#     except frappe.DoesNotExistError:
#         frappe.logger().error(f"Document not found: {doc_name}")
#         return "Document not found"
    
#     # Clear existing KPIs and MOPs
#     doc.kpis_and_mops = []
    
#     for kra_row in doc.kras:
#         kra_doc = frappe.get_doc("KRA", kra_row.kra)
#         if kra_doc.custom_kpi_and_mop:
#             for kpi_mop in kra_doc.custom_kpi_and_mop:
#                 doc.append("kpis_and_mops", {
#                     "kra": kra_row.kra,
#                     "kpi": kpi_mop.kpi,
#                     "mop": kpi_mop.mop,
#                     "kpi_weightage": kpi_mop.kpi_weightage,
#                     "q1": kpi_mop.q1,
#                     "q2": kpi_mop.q2,
#                     "q3": kpi_mop.q3,
#                     "q4": kpi_mop.q4
#                 })
    
#     doc.save()
#     frappe.db.commit()
#     return doc.kpis_and_mops\
    
    
import frappe
from frappe import _

@frappe.whitelist()
def create_performance_sheets(docname):
    doc = frappe.get_doc("GOAL and KRA Template", docname)
    for employee in doc.employees:
        # Create a new Performance Management Sheet
        new_pms = frappe.get_doc({
            "doctype": "Performance Management Sheet",
            "employee": employee.employee,
            "employee_name": employee.employee,
            "department": employee.department,
            "designation": employee.designation,
            "kras": [
                {
                    "kra": kra.kra,
                    "total_kra_weightage": kra.weightage
                }
                for kra in doc.kras
            ],
            "kpis_and_mops": [
                {
                    "kpi": kpi.kpi,
                    "mop": kpi.mop,
                    "kpi_weightage": kpi.kpi_weightage,
                    "q1": kpi.q1,
                    "q2": kpi.q2,
                    "q3": kpi.q3,
                    "q4": kpi.q4
                }
                for kpi in doc.kpis_and_mops
            ]
        })
        new_pms.insert()

        # Prepare the message with a hyperlink to the new Performance Management Sheet
        msg = f"Performance Management Sheet <b>{new_pms.name}</b> has been created successfully!!!"
        link = f"<b><a href='/app/performance-management-sheet/{new_pms.name}'>{new_pms.name}</a></b>"
        full_msg = _(msg + ". " + link)
        
        # Display the message
        frappe.msgprint(full_msg, raise_exception=False)
        
    return new_pms




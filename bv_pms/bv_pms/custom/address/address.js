frappe.ui.form.on('Address', {
    state: function(frm) {
        // Get the value of the State field
        var state = frm.doc.state;

        // Check if the state is Maharashtra
        if (state === 'Maharashtra') {
            frm.set_value('tax_category', 'In-State');
        } else {
            frm.set_value('tax_category', 'Out-State');
        }
    }
});

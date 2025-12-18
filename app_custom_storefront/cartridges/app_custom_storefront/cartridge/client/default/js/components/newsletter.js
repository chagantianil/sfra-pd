'use strict';

module.exports = function () {
    $('#newsletter-form').on('submit', function (e) {
        e.preventDefault(); 
        var $form = $(this);
        var $errorContainer = $form.closest('#newsletter-container').find('#newsletter-error');
        var url = $form.attr('action');
        $errorContainer.hide();
        if (!this.checkValidity()) {
            this.reportValidity();
            return;
        }
        var formData = $form.serialize();
        $.ajax({
            url: url,
            method: 'POST',
            data: formData,
            dataType: 'json',
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        .done(function (data) {
            if (data.success && data.html) {
                $('#newsletter-container').html(data.html);
            } else {
                $errorContainer.text(data.error || 'An unknown error occurred.').show();
            }
        })
        .fail(function (jqXHR, textStatus, errorThrown) {
            console.error('AJAX Error:', textStatus, errorThrown);
        });
    });

    $('.dob').on('input', function () {
        let val = $(this).val().replace(/\D/g, '').slice(0, 8);
        if (val.length >= 5) {
            val = val.replace(/(\d{2})(\d{2})(\d{0,4})/, '$1/$2/$3');
        } else if (val.length >= 3) {
            val = val.replace(/(\d{2})(\d{0,2})/, '$1/$2');
        }
        $(this).val(val);
    });
};

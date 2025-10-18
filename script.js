(function () {
    const form = document.querySelector('.contact-form');
    if (!form) return;

    const feedback = form.querySelector('.form-feedback');
    const submitButton = form.querySelector('button[type="submit"]');

    function setFeedback(message, type) {
        if (!feedback) return;
        feedback.textContent = message;
        feedback.classList.remove('success', 'error');
        if (type) {
            feedback.classList.add(type);
        }
    }

    function validateEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const formData = new FormData(form);
        const honeypotValue = formData.get('website');
        if (honeypotValue) {
            setFeedback('Something went wrong. Please try again later.', 'error');
            return;
        }

        const name = (formData.get('name') || '').trim();
        const email = (formData.get('email') || '').trim();
        const company = (formData.get('company') || '').trim();
        const message = (formData.get('message') || '').trim();

        if (!name) {
            setFeedback('Please provide your name.', 'error');
            form.querySelector('[name="name"]').focus();
            return;
        }

        if (!email || !validateEmail(email)) {
            setFeedback('Please enter a valid email address.', 'error');
            form.querySelector('[name="email"]').focus();
            return;
        }

        if (!message || message.length < 10) {
            setFeedback('Please include a message with at least 10 characters.', 'error');
            form.querySelector('[name="message"]').focus();
            return;
        }

        const payload = { name, email, company, message };

        submitButton.disabled = true;
        setFeedback('Sending your message...', '');

        try {
            const response = await fetch(form.action, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({}));
                throw new Error(errorBody.message || 'We could not send your message. Please try again.');
            }

            const responseBody = await response.json();
            setFeedback(responseBody.message || 'Thanks! Your message has been sent.', 'success');
            form.reset();
        } catch (error) {
            setFeedback(error.message || 'We could not send your message. Please try again later.', 'error');
        } finally {
            submitButton.disabled = false;
        }
    });
})();

/* js/form.js
   Client-side form handling for contact.html
   - Validates fields (name, email, subject, message)
   - Uses a honeypot for spam protection (input[name="hp"])
   - Submits via fetch to form.action (or data-endpoint) as JSON
   - Handles success / error states and accessible status messages
   - Progressive enhancement friendly: works only when JS is available,
     otherwise the form will submit normally (server-side)
*/

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('contact-form');
  if (!form) return;

  // Elements
  const statusEl = document.getElementById('form-status');
  const submitBtn = form.querySelector('button[type="submit"]');
  const inputs = {
    name: form.querySelector('input[name="name"]'),
    email: form.querySelector('input[name="email"]'),
    subject: form.querySelector('input[name="subject"]'),
    message: form.querySelector('textarea[name="message"]'),
    honeypot: form.querySelector('input[name="hp"]') // optional honeypot input
  };

  // Helper: show status accessible message
  function setStatus(message, type = 'info') {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.className = `form-status form-status--${type}`; // allow styling: .form-status--success / --error
    statusEl.setAttribute('role', 'status');
    statusEl.setAttribute('aria-live', 'polite');
  }

  // Helper: enable/disable submit
  function setSubmitting(isSubmitting) {
    if (submitBtn) {
      submitBtn.disabled = isSubmitting;
      submitBtn.setAttribute('aria-disabled', isSubmitting ? 'true' : 'false');
      submitBtn.textContent = isSubmitting ? 'Sending…' : 'Send Message';
    }
  }

  // Basic validators
  function isEmail(v) {
    // conservative regex for client-side only
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }

  function validate() {
    const errors = {};

    const name = inputs.name && inputs.name.value.trim();
    const email = inputs.email && inputs.email.value.trim();
    const subject = inputs.subject && inputs.subject.value.trim();
    const message = inputs.message && inputs.message.value.trim();

    if (!name) errors.name = 'Please enter your name.';
    if (!email || !isEmail(email)) errors.email = 'Please enter a valid email.';
    if (!subject) errors.subject = 'Please enter a subject.';
    if (!message || message.length < 10) errors.message = 'Message must be at least 10 characters.';

    return { valid: Object.keys(errors).length === 0, errors };
  }

  // Show inline errors (expects .error-msg small elements in markup)
  function showErrors(errors) {
    // Hide all error messages first
    const errorEls = form.querySelectorAll('.error-msg');
    errorEls.forEach(el => (el.style.display = 'none'));

    // For each field error, find nearest .error-msg sibling and show it
    Object.keys(errors).forEach(key => {
      const field = inputs[key];
      if (!field) return;
      const group = field.closest('.form-group');
      if (!group) return;
      const errEl = group.querySelector('.error-msg');
      if (errEl) {
        errEl.textContent = errors[key];
        errEl.style.display = 'block';
      }
    });
  }

  // Clear inline errors
  function clearErrors() {
    const errorEls = form.querySelectorAll('.error-msg');
    errorEls.forEach(el => {
      el.textContent = '';
      el.style.display = 'none';
    });
  }

  // Build payload
  function buildPayload() {
    return {
      name: inputs.name.value.trim(),
      email: inputs.email.value.trim(),
      subject: inputs.subject.value.trim(),
      message: inputs.message.value.trim(),
      // include any extra fields if needed
    };
  }

  // Default endpoint: prefer explicit data-endpoint attribute, then form.action, then /api/contact
  function getEndpoint() {
    return (
      form.getAttribute('data-endpoint') ||
      form.action && form.action !== '#' ? form.action :
      '/api/contact'
    );
  }

  // Submit handler
  form.addEventListener('submit', async (e) => {
    // If you want to allow server-side fallback, don't prevent default until we decide.
    e.preventDefault();

    clearErrors();
    setStatus('', 'info');

    // Honeypot check: if filled, silently fail (bot)
    if (inputs.honeypot && inputs.honeypot.value) {
      // pretend success to confuse bots
      setStatus('Message sent. Thank you!', 'success');
      form.reset();
      return;
    }

    const { valid, errors } = validate();
    if (!valid) {
      showErrors(errors);
      setStatus('Please fix the errors in the form.', 'error');
      return;
    }

    // Prepare to submit
    const endpoint = getEndpoint();
    const payload = buildPayload();

    setSubmitting(true);
    setStatus('Sending message...', 'info');

    try {
      // Prefer JSON POST to endpoint
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      // If endpoint responds 2xx treat as success
      if (resp.ok) {
        // Try parse json for friendly message
        let body;
        try { body = await resp.json(); } catch (_) { body = null; }
        const successMsg = (body && body.message) ? body.message : 'Message sent. Thank you!';
        setStatus(successMsg, 'success');
        form.reset();
      } else {
        // Non-200 from server
        let errText = `Server responded with ${resp.status}`;
        try {
          const body = await resp.json();
          if (body && body.error) errText = body.error;
          else if (body && body.message) errText = body.message;
        } catch (_) { /* ignore parse error */ }

        setStatus(`Unable to send message: ${errText}`, 'error');
        // Optionally show server-side field errors if provided (body.errors)
        try {
          const body = await resp.json();
          if (body && body.errors && typeof body.errors === 'object') {
            showErrors(body.errors);
          }
        } catch (_) { /* ignore */ }
      }
    } catch (err) {
      console.error('Contact form error:', err);
      setStatus('Network error. Please try again later.', 'error');
    } finally {
      setSubmitting(false);
    }
  });

  // Progressive UX: validate on blur to show helpful immediate errors
  Object.keys(inputs).forEach((k) => {
    const el = inputs[k];
    if (!el) return;
    el.addEventListener('blur', () => {
      const { valid, errors } = validate();
      if (!valid) {
        showErrors(errors);
      } else {
        clearErrors();
      }
    });
  });

  // Accessibility: focus first invalid field when submit attempted
  form.addEventListener('invalid', (e) => {
    e.preventDefault();
    const invalidField = form.querySelector(':invalid');
    if (invalidField) invalidField.focus();
  }, true);
});

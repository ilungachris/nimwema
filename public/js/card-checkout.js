// Nimwema - Card Checkout (standalone, safe, minimal)
(function () {
  const qs = (k) => new URLSearchParams(location.search).get(k) || '';
  const el = (id) => document.getElementById(id);

  // Pull params from URL
  const order = qs('order');
  const amount = qs('amount');
  const currency = qs('currency') || 'CDF';

  // Fill summary + hidden fields
  document.addEventListener('DOMContentLoaded', () => {
    el('sumOrder').textContent = order || '—';
    el('sumAmount').textContent = formatAmount(amount, currency);
    el('sumCurrency').textContent = currency;

    el('orderId').value = order;
    el('amount').value = amount;
    el('currency').value = currency;

    // Default masks
    setupCardMasks();
    bindSubmit();
  });

  function formatAmount(v, cur) {
    const n = Math.max(0, parseInt(String(v || '0'), 10) || 0);
    const fmt = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0 });
    return `${fmt.format(n)} ${cur}`;
  }

  // Basic Luhn check
  function luhnOk(number) {
    const digits = String(number).replace(/\s+/g, '');
    if (!/^\d{12,19}$/.test(digits)) return false;
    let sum = 0, dbl = false;
    for (let i = digits.length - 1; i >= 0; i--) {
      let d = parseInt(digits[i], 10);
      if (dbl) { d *= 2; if (d > 9) d -= 9; }
      sum += d; dbl = !dbl;
    }
    return sum % 10 === 0;
  }

  function setupCardMasks() {
    const number = el('number');
    const exp = el('exp');
    const cvc = el('cvc');

    number.addEventListener('input', () => {
      const pos = number.selectionStart || number.value.length;
      const raw = number.value.replace(/[^\d]/g, '').slice(0, 19);
      number.value = raw.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
      try { number.setSelectionRange(pos, pos); } catch {}
    });

    exp.addEventListener('input', () => {
      let v = exp.value.replace(/[^\d]/g, '').slice(0, 4);
      if (v.length >= 3) v = v.slice(0, 2) + '/' + v.slice(2);
      exp.value = v;
    });

    cvc.addEventListener('input', () => {
      cvc.value = cvc.value.replace(/[^\d]/g, '').slice(0, 4);
    });
  }

  function showError(id, msg) {
    const box = el(id);
    if (box) { box.textContent = msg || ''; box.classList.toggle('hidden', !msg); }
  }

  function clearErrors() {
    ['holderError','numberError','expError','cvcError','emailError'].forEach(id => showError(id, ''));
  }

  function parseExpiry(mmYY) {
    const m = String(mmYY || '').trim();
    if (!/^\d{2}\/\d{2}$/.test(m)) return null;
    const mm = parseInt(m.slice(0,2),10);
    const yy = parseInt(m.slice(3,5),10);
    if (mm < 1 || mm > 12) return null;
    // naive expiry check: assume 20xx
    const year = 2000 + yy;
    return { mm, yy, year };
  }

  function bindSubmit() {
    const form = el('cardCheckoutForm');
    const payBtn = el('payBtn');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      clearErrors();

      const holder = el('holder').value.trim();
      const number = el('number').value.replace(/\s+/g, '');
      const expRaw = el('exp').value.trim();
      const cvc = el('cvc').value.trim();
      const email = el('email').value.trim();

      let ok = true;

      if (holder.length < 2) { showError('holderError', 'Nom invalide'); ok = false; }
      if (!luhnOk(number)) { showError('numberError', 'Numéro de carte invalide'); ok = false; }

      const exp = parseExpiry(expRaw);
      if (!exp) { showError('expError', 'Expiration invalide (MM/AA)'); ok = false; }

      if (!/^\d{3,4}$/.test(cvc)) { showError('cvcError', 'CVC invalide'); ok = false; }

      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showError('emailError', 'Email invalide'); ok = false;
      }

      if (!ok) return;

      // Disable button (simple guard)
      payBtn.disabled = true;
      payBtn.textContent = 'Traitement…';

      // Prepare payload
      const payload = {
        orderId: el('orderId').value,
        amount: parseInt(el('amount').value, 10) || 0,
        currency: el('currency').value || 'CDF',
        card: {
          holderName: holder,
          number: number,
          expiryMonth: exp.mm,
          expiryYear: exp.yy,
          cvc: cvc
        },
        email: email || null,
        type: '2' // FlexPay card
      };

      // Endpoint (keep separate from MoMo)
      const url = '/api/payment/flexpay/card/initiate';

      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
		
console.log('Payment load is this:', payload);

        if (!res.ok) {
          const raw = await res.text().catch(()=>'');
          throw new Error(res.status === 404 ? 'Endpoint introuvable' : `Erreur serveur (${res.status})`);
        }

        const data = await res.json().catch(() => ({}));
        // Expect either a redirect URL, or success + orderId
        if (data.redirectUrl) {
          window.location.href = data.redirectUrl;
          return;
        }
        if (data.success) {
          const orderId = data.orderId || payload.orderId;
          const okUrl = (window.PAYMENT_SUCCESS_URL || '/payment-success.html') + `?order=${encodeURIComponent(orderId)}`;
          window.location.href = okUrl;
          return;
        }

        throw new Error(data.message || 'Paiement carte refusé');
      } catch (err) {
        console.error('Card payment error:', err);
        const koUrl = (window.PAYMENT_CANCEL_URL || '/payment-cancel.html') + `?order=${encodeURIComponent(payload.orderId)}`;
        try { window.location.href = koUrl; } catch {}
      } finally {
        payBtn.disabled = false;
        payBtn.textContent = 'Payer maintenant';
      }
    });
  }
})();

// js/billing.js
// Reusable billing section — drop into any dashboard
// Usage: billingComponent.render('billing-container-id')

const billingComponent = {

  async render(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '<p style="color:var(--text-muted)">Loading billing info...</p>';

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('tier, stripe_customer_id, stripe_subscription_id, tier_updated_at')
      .eq('id', user.id)
      .single();

    if (!profile) return;

    const tier = profile.tier || 'basic';
    const tierLabels = {
      basic:    { label: 'Basic',    color: '#6b7280', bg: '#f3f4f6' },
      featured: { label: 'Featured', color: '#1d4ed8', bg: '#dbeafe' },
      premium:  { label: 'Premium',  color: '#7c3aed', bg: '#ede9fe' },
    };
    const t = tierLabels[tier];

    const hasSubscription = !!profile.stripe_subscription_id;

    container.innerHTML = `
      <div class="billing-card">
        <div class="billing-header">
          <div>
            <div class="billing-title">Subscription</div>
            <div class="billing-plan">
              <span class="tier-badge" style="background:${t.bg};color:${t.color}">${t.label}</span>
              ${tier === 'basic' ? '<span class="billing-hint">Free forever</span>' : ''}
            </div>
          </div>
          ${tier !== 'basic' ? `
            <button class="btn-manage-billing" onclick="billingComponent.openPortal()">
              Manage billing
            </button>
          ` : `
            <a href="/pages/upgrade.html" class="btn-upgrade-now">
              Upgrade plan
            </a>
          `}
        </div>

        ${tier === 'basic' ? `
          <div class="billing-upgrade-prompt">
            <div class="billing-upgrade-text">
              <strong>Unlock more with Featured or Premium</strong>
              <span>Post vacancies, receive enquiries, and appear at the top of search results.</span>
            </div>
            <a href="/pages/upgrade.html" class="btn-see-plans">See plans →</a>
          </div>
        ` : ''}

        ${hasSubscription ? `
          <div class="billing-details">
            <div class="billing-detail-row">
              <span>Status</span>
              <span class="status-active">● Active</span>
            </div>
            <div class="billing-detail-row">
              <span>Billing</span>
              <span>Monthly</span>
            </div>
            <div class="billing-detail-row">
              <span>Amount</span>
              <span>${tier === 'featured' ? '$49' : '$99'} AUD / month</span>
            </div>
          </div>
          <p class="billing-note">
            To cancel, update your card, or view invoices — click "Manage billing" above. 
            Cancellations take effect at the end of your billing period.
          </p>
        ` : ''}
      </div>
    `;
  },

  async openPortal() {
    const btn = document.querySelector('.btn-manage-billing');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Opening...';
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const response = await fetch('/api/create-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });

      const { url, error } = await response.json();
      if (error) throw new Error(error);
      window.location.href = url;

    } catch (err) {
      console.error(err);
      alert('Could not open billing portal. Please try again.');
      if (btn) { btn.disabled = false; btn.textContent = 'Manage billing'; }
    }
  }
};

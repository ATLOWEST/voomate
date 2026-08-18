'use client';

import { useState } from 'react';
import { ArrowRight, Check, X } from 'lucide-react';

/* ─── Animated value flip ─── */
function Flip({ showA, a, b }: { showA: boolean; a: string; b: string }) {
  const cls = 'transition-all duration-500';
  return (
    <span className="pricing-flip-inline">
      <span className={`${cls} ${showA ? 'pricing-flip--in' : 'pricing-flip--out-up'}`}>{a}</span>
      <span className={`${cls} ${!showA ? 'pricing-flip--in' : 'pricing-flip--out-down'}`}>{b}</span>
    </span>
  );
}

export function PricingGrid() {
  const [isMax, setIsMax] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [emailStr, setEmailStr] = useState('');
  const [emailError, setEmailError] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const freeProviders = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'aol.com', 'mail.com'];
    const domain = emailStr.split('@')[1]?.toLowerCase();
    
    if (!domain || freeProviders.includes(domain)) {
      setEmailError(true);
      return;
    }
    
    setEmailError(false);
    setSubmitted(true);
  };

  return (
    <div className="pricing-surface">
      <div className="pricing-columns">

        {/* ──── COLUMN 1 — Pay as you go ──── */}
        <div className="pricing-col">
          <div className="pricing-col__top">
            <div className="pricing-col__header-slot">
              <h3 className="pricing-col__name">Pay as you go</h3>
            </div>
            <p className="pricing-col__desc">Top up credits anytime — no commitment.</p>

            <div className="pricing-col__price">
              <span className="pricing-col__amount">₹0</span>
              <span className="pricing-col__period">to start</span>
            </div>

            <div className="pricing-col__cta-slot">
              <a href="#" className="pricing-col__cta pricing-col__cta--outline">
                Get started <ArrowRight size={14} />
              </a>
            </div>
          </div>

          <div className="pricing-col__body">
            <p className="pricing-col__includes">Includes:</p>
            <ul className="pricing-col__list">
              <li><Check size={14} /> 300 bonus credits on first top-up</li>
              <li><Check size={14} /> 60 requests per minute</li>
              <li><Check size={14} /> Community support</li>
              <li><Check size={14} /> Single workspace</li>
              <li><Check size={14} /> Basic analytics</li>
            </ul>
          </div>
        </div>

        {/* ──── COLUMN 2 — Pro / Max ──── */}
        <div className="pricing-col">
          <div className="pricing-col__top">
            <div className="pricing-col__header-slot pricing-col__name-row">
              <h3 className="pricing-col__name">Pro</h3>
              {/* Toggle */}
              <div className="pricing-toggle">
                <button
                  type="button"
                  onClick={() => setIsMax(false)}
                  className={`pricing-toggle__btn ${!isMax ? 'pricing-toggle__btn--active' : ''}`}
                >
                  Pro
                </button>
                <button
                  type="button"
                  onClick={() => setIsMax(true)}
                  className={`pricing-toggle__btn ${isMax ? 'pricing-toggle__btn--active' : ''}`}
                >
                  Max
                </button>
              </div>
            </div>
            <p className="pricing-col__desc">{!isMax ? 'For startups and growing teams' : 'Scale with higher limits'}</p>

            <div className="pricing-col__price">
              <div className="pricing-col__price-flip">
                <span className={`pricing-col__amount ${!isMax ? 'pricing-flip--in' : 'pricing-flip--out-up'}`}>₹10,000</span>
                <span className={`pricing-col__amount ${isMax ? 'pricing-flip--in' : 'pricing-flip--out-down'}`}>₹20,000</span>
              </div>
              <span className="pricing-col__period">/ month</span>
            </div>

            <div className="pricing-col__cta-slot">
              <div className="pricing-col__cta-flip">
                <a href="#" className={`pricing-col__cta pricing-col__cta--outline ${!isMax ? 'pricing-flip--in' : 'pricing-flip--out-up'}`}>
                  Get Pro <ArrowRight size={14} />
                </a>
                <a href="#" className={`pricing-col__cta pricing-col__cta--solid ${isMax ? 'pricing-flip--in' : 'pricing-flip--out-down'}`}>
                  Get Max <ArrowRight size={14} />
                </a>
              </div>
            </div>
          </div>

          <div className="pricing-col__body">
            <p className="pricing-col__includes">
              <Flip showA={!isMax} a="Everything in Pay as you go, and:" b="Everything in Pro, and:" />
            </p>
            <ul className="pricing-col__list">
              <li><Check size={14} /> <Flip showA={!isMax} a="12,000 credits included" b="25,000 credits included" /></li>
              <li><Check size={14} /> <Flip showA={!isMax} a="₹2,000 bonus credits" b="₹5,000 bonus credits" /></li>
              <li><Check size={14} /> <Flip showA={!isMax} a="200 requests per minute" b="500 requests per minute" /></li>
              <li><Check size={14} /> <Flip showA={!isMax} a="Email support" b="Priority support" /></li>
              <li><Check size={14} /> Multilingual conversations</li>
              <li><Check size={14} /> Custom widget branding</li>
            </ul>
          </div>
        </div>

        {/* ──── COLUMN 3 — Custom ──── */}
        <div className="pricing-col">
          <div className="pricing-col__top">
            <div className="pricing-col__header-slot">
              <h3 className="pricing-col__name">Custom</h3>
            </div>
            <p className="pricing-col__desc">Tailored for your organization & high volume needs.</p>

            {/* Invisible price spacer to preserve horizontal alignment without duplicate text */}
            <div className="pricing-col__price pricing-col__price--spacer" aria-hidden="true" />

            <div className="pricing-col__cta-slot">
              {!formOpen ? (
                <button
                  type="button"
                  id="talk-to-team-btn"
                  onClick={() => setFormOpen(true)}
                  className="pricing-col__cta pricing-col__cta--solid talk-to-team-btn"
                >
                  Talk to the team <ArrowRight size={14} />
                </button>
              ) : submitted ? (
                <div className="pricing-inline-form pricing-inline-form--success animate-pricing-form-success">
                  <div className="pricing-inline-form__success-icon animate-pricing-success-icon">
                    <Check size={22} />
                  </div>
                  <h4 className="pricing-inline-form__success-title">We'd love to hear more from you!</h4>
                  <p className="pricing-inline-form__success-desc">We are reaching out to you soon.</p>
                </div>
              ) : (
                <div className="pricing-inline-form animate-pricing-form">
                  <div className="pricing-inline-form__head">
                    <span>Get in touch</span>
                    <button type="button" onClick={() => setFormOpen(false)} className="pricing-inline-form__close" aria-label="Close">
                      <X size={14} />
                    </button>
                  </div>
                  <form onSubmit={handleFormSubmit}>
                    <div className="pricing-inline-form__row">
                      <input required placeholder="First name *" />
                      <input required placeholder="Last name *" />
                    </div>
                    <input 
                      required 
                      type="email" 
                      placeholder="Work email *" 
                      value={emailStr}
                      onChange={(e) => { setEmailStr(e.target.value); setEmailError(false); }}
                      className={emailError ? 'error' : ''}
                    />
                    {emailError && <span className="pricing-inline-form__error">Please enter a valid work email address.</span>}
                    <div className="pricing-inline-form__row">
                      <input defaultValue="+91" className="pricing-inline-form__country-code" />
                      <input required type="tel" placeholder="Phone *" />
                    </div>
                    <div className="pricing-inline-form__row">
                      <input required placeholder="Company *" />
                      <input placeholder="Role / Title" />
                    </div>
                    <button type="submit" className="pricing-col__cta pricing-col__cta--solid pricing-inline-form__submit">
                      Submit request <ArrowRight size={13} />
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>

          <div className="pricing-col__body">
            <p className="pricing-col__includes">Everything in Max, and:</p>
            <ul className="pricing-col__list">
              <li><Check size={14} /> Custom conversation volume</li>
              <li><Check size={14} /> Multiple tenant-scoped workspaces</li>
              <li><Check size={14} /> Dedicated onboarding support</li>
              <li><Check size={14} /> Custom ERP, CRM & OMS adapters</li>
              <li><Check size={14} /> Security & compliance review</li>
              <li><Check size={14} /> Priority support channels</li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}


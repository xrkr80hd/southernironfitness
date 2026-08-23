import Image from "next/image";

const gymdeskLoginUrl = "https://southern-iron-fitness.gymdesk.com/login";
const gymdeskSignupUrl = "https://southern-iron-fitness.gymdesk.com/signup";

const PhotoBlock = ({
  label,
  title,
  description,
  tall = false,
  imageSrc,
  imageAlt,
  imagePosition = "center",
  className = "",
  hideContent = false,
}: {
  label: string;
  title: string;
  description: string;
  tall?: boolean;
  imageSrc?: string;
  imageAlt?: string;
  imagePosition?: string;
  className?: string;
  hideContent?: boolean;
}) => (
  <div
    className={`photo-block ${tall ? "photo-block--tall" : ""} ${
      imageSrc ? "photo-block--has-image" : ""
    } ${className}`}
  >
    {imageSrc ? (
      <Image
        className="photo-image"
        src={imageSrc}
        alt={imageAlt ?? ""}
        fill
        sizes={tall ? "(max-width: 900px) 100vw, 56vw" : "(max-width: 900px) 100vw, 42vw"}
        style={{ objectPosition: imagePosition }}
      />
    ) : null}
    {hideContent ? null : (
      <>
        <span className="photo-label">{label}</span>
        <div>
          <strong>{title}</strong>
          <p>{description}</p>
        </div>
      </>
    )}
  </div>
);

export default function Home() {
  return (
    <main>
      <a className="skip-link" href="#about">
        Skip to content
      </a>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Southern Iron Fitness home">
          <span className="brand-mark">
            <Image
              src="/brand/southern-iron-compact-dark.svg"
              alt=""
              width={384}
              height={344}
              priority
            />
          </span>
          <span>
            Southern Iron
            <small>Fitness · Woodworth, LA</small>
          </span>
        </a>
        <nav className="desktop-nav" aria-label="Main navigation">
          <a href="#about">The Gym</a>
          <a href="#training">Training</a>
          <a href="#contact">Contact</a>
        </nav>
        <div className="header-actions">
          <a className="button button--small" href={gymdeskSignupUrl} target="_blank" rel="noreferrer">
            Sign Up
          </a>
          <a className="button button--small button--outline" href={gymdeskLoginUrl} target="_blank" rel="noreferrer">
            Member Login
          </a>
        </div>
        <details className="mobile-menu">
          <summary aria-label="Open navigation">
            <span />
            <span />
            <span />
          </summary>
          <div className="mobile-menu-panel">
            <a href="#about">The Gym</a>
            <a href="#training">Training</a>
            <a href="#gymdesk">Membership</a>
            <a href="#contact">Contact</a>
            <a className="button button--small" href={gymdeskSignupUrl} target="_blank" rel="noreferrer">
              Sign Up
            </a>
            <a className="button button--small button--outline" href={gymdeskLoginUrl} target="_blank" rel="noreferrer">Member Login
            </a>
          </div>
        </details>
      </header>

      <section className="hero" id="top">
        <div className="hero-content">
          <p className="eyebrow">Opening soon · Woodworth, Louisiana</p>
          <h1>
            Built for the
            <span>strong.</span>
          </h1>
          <p className="hero-copy">
            Premium strength and conditioning for people ready to train with
            purpose, push harder, and build real results.
          </p>
          <div className="button-row">
            <a className="button" href={gymdeskSignupUrl} target="_blank" rel="noreferrer">
              Sign Up
            </a>
            <a className="button button--outline" href={gymdeskLoginUrl} target="_blank" rel="noreferrer">
              Member Login
            </a>
            <a className="text-link" href="#about">
              Explore the gym <span>↓</span>
            </a>
          </div>
          <div className="hero-facts">
            <span>Highway 165</span>
            <span>Woodworth Plaza</span>
            <span>Strength · Discipline · Community</span>
          </div>
        </div>
        <PhotoBlock
          tall
          label="Southern Iron weight floor"
          title="Real equipment. Real work."
          description="A serious strength floor built for focused training, steady progress, and Woodworth's strongest community."
          imageSrc="/photos/fitness-foto.jpeg"
          imageAlt="Southern Iron Fitness weight floor with benches, dumbbells, mirrors, and cable equipment"
          imagePosition="center"
        />
      </section>

      <section className="intro section" id="about">
        <div>
          <p className="eyebrow">Not just another gym</p>
          <h2>Woodworth deserves a serious place to train.</h2>
        </div>
        <div className="intro-copy">
          <p>
            Southern Iron Fitness is being built around excellent equipment,
            focused training, and a community that expects more from itself.
          </p>
          <a className="text-link" href="#training">
            See the training areas <span>→</span>
          </a>
        </div>
      </section>

      <section className="feature-grid section" id="training">
        <article className="feature-card feature-card--wide">
          <h3>Strength Floor</h3>
          <p>Racks, platforms, free weights, and equipment built for progress.</p>
          <PhotoBlock
            label="Facility photo · 4:5"
            title="Portrait equipment-floor photo"
            description="Real Southern Iron equipment floor cropped to match the feature-card set."
            imageSrc="/photos/strength_floor.jpg"
            imageAlt="Southern Iron Fitness strength floor with benches, mirrors, and free weights"
            imagePosition="center"
            className="feature-photo feature-photo--portrait"
            hideContent
          />
        </article>
        <article className="feature-card">
          <h3>Coaching</h3>
          <p>Space reserved for personal training or coaching information.</p>
          <PhotoBlock
            label="People photo · 4:5"
            title="Trainer helping a real member"
            description="Show instruction or encouragement—not a posed headshot. Capture a genuine coaching moment."
            imageSrc="/photos/training-soon.png"
            imageAlt="Trainer coaching a member during a cable row at Southern Iron Fitness"
            imagePosition="center 32%"
            className="feature-photo feature-photo--portrait"
            hideContent
          />
        </article>
        <article className="feature-card">
          <h3>Community</h3>
          <p>A local gym where hard work and good people belong together.</p>
          <PhotoBlock
            label="Community photo · 4:5"
            title="Members together after a workout"
            description="Use a warm group photo with different ages and fitness levels. Keep it welcoming, not intimidating."
            imageSrc="/photos/friends-workout.png"
            imageAlt="Southern Iron Fitness members smiling together after a workout"
            imagePosition="center 18%"
            className="feature-photo feature-photo--portrait"
            hideContent
          />
        </article>
      </section>

      <section className="gymdesk section" id="gymdesk">
        <div className="gymdesk-copy">
          <p className="eyebrow">Membership</p>
          <h2>It&apos;s simple.</h2>
          <ul>
            <li>Choose your plan below</li>
            <li>Sign up online</li>
            <li>Member Login anytime for account access</li>
          </ul>
        </div>
        <div className="gymdesk-embed">
          <h3>Membership options</h3>
          <p className="membership-kicker">Turn one day into Day One.</p>
          <div className="plan-row">
            <div>
              <strong>Single</strong>
              <small>Standard monthly membership</small>
            </div>
            <span>$45/mo</span>
          </div>
          <div className="plan-row">
            <div>
              <strong>Couple</strong>
              <small>Two-person monthly membership</small>
            </div>
            <span>$55/mo</span>
          </div>
          <div className="plan-row">
            <div>
              <strong>Family</strong>
              <small>Three people, includes ages 13-17 in household</small>
            </div>
            <span>$65/mo</span>
          </div>
          <div className="plan-row">
            <div>
              <strong>Family Plus</strong>
              <small>Four or more people in the household</small>
            </div>
            <span>$80/mo</span>
          </div>
          <div className="rate-strip">
            <span>
              <strong>Day Pass:</strong>
              <em>$10</em>
            </span>
            <span>
              <strong>Guest Pass:</strong>
              <em>$5</em>
            </span>
          </div>
          <div className="service-rates">
            <strong>Service and group rates</strong>
            <p>Available for groups of 8 or more, first responders, veterans, active military, law enforcement, fire, EMS, EMTs, paramedics, and nurses.</p>
            <div>
              <span>
                <strong>Single</strong>
                <em>$30/mo</em>
              </span>
              <span>
                <strong>Couple</strong>
                <em>$40/mo</em>
              </span>
              <span>
                <strong>Family</strong>
                <em>$65/mo</em>
              </span>
            </div>
          </div>
          <a className="gymdesk-action" href={gymdeskSignupUrl} target="_blank" rel="noreferrer">
            Sign Up Through Gymdesk →
          </a>
          <p className="embed-note">
            Members can use the Gymdesk portal for account access.
          </p>
        </div>
      </section>

      <section className="schedule section">
        <div>
          <h2>Classes and Appointments</h2>
          <p>Coming soon.</p>
        </div>
      </section>

      <section className="final-cta section" id="contact">
        <p className="eyebrow">FAQ and contact</p>
        <h2>Questions before you join?</h2>
        <p>
          Get the basics on membership, account access, and where to send
          questions before you sign up.
        </p>
        <div className="faq-grid">
          <article>
            <strong>How do I join?</strong>
            <p>Use Gymdesk to choose a membership and complete signup online.</p>
          </article>
          <article>
            <strong>Where do I log in?</strong>
            <p>Use Member Login to manage account access through Gymdesk.</p>
          </article>
          <article>
            <strong>Need help first?</strong>
            <p>Send a question and Southern Iron will follow up directly.</p>
          </article>
        </div>
        <div className="button-row button-row--center">
          <a className="button" href="mailto:info@southernironfitness.com">
            Ask a Question
          </a>
          <a className="button button--outline" href={gymdeskLoginUrl} target="_blank" rel="noreferrer">
            Member Login
          </a>
        </div>
      </section>

      <section className="location-band" aria-label="Southern Iron Fitness location">
        <div>
          <p className="eyebrow">Find us</p>
          <h2>Southern Iron Fitness</h2>
          <a
            className="address-link"
            href="https://www.google.com/maps/search/?api=1&query=9338%20Highway%20165%20South%2C%20Suite%20F%2C%20Woodworth%2C%20LA%2071485"
            target="_blank"
            rel="noreferrer"
          >
            9338 Highway 165 South, Suite F
            <span>Woodworth, LA 71485</span>
          </a>
          <div className="location-actions">
            <a className="text-link" href="mailto:info@southernironfitness.com">
              Ask a question <span>→</span>
            </a>
          </div>
        </div>
        <iframe
          className="map-frame"
          title="Map to Southern Iron Fitness"
          src="https://www.google.com/maps?q=9338%20Highway%20165%20South%2C%20Suite%20F%2C%20Woodworth%2C%20LA%2071485&output=embed"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </section>

      <footer>
        <div className="brand">
          <span className="brand-mark">
            <Image
              src="/brand/southern-iron-compact-dark.svg"
              alt=""
              width={384}
              height={344}
            />
          </span>
          <span>Southern Iron Fitness</span>
        </div>
        <p>
          <a
            href="https://www.google.com/maps/search/?api=1&query=9338%20Highway%20165%20South%2C%20Suite%20F%2C%20Woodworth%2C%20LA%2071485"
            target="_blank"
            rel="noreferrer"
          >
            9338 Highway 165 South, Suite F · Woodworth, LA 71485
          </a>
        </p>
        <div>
          <a href={gymdeskLoginUrl} target="_blank" rel="noreferrer">Member Login</a>
        </div>
      </footer>
    </main>
  );
}

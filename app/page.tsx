import Image from "next/image";

const gymdeskUrl = "https://southern-iron-fitness.gymdesk.com/login";

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
        <nav aria-label="Main navigation">
          <a href="#about">The Gym</a>
          <a href="#training">Training</a>
          <a href="#gallery">Gallery</a>
          <a href="#contact">Contact</a>
        </nav>
        <a className="button button--small" href={gymdeskUrl} target="_blank" rel="noreferrer">
          Join the Founders Club
        </a>
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
            <a className="button" href={gymdeskUrl} target="_blank" rel="noreferrer">
              Reserve My Membership
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
          label="Hero photo · 16:10 landscape"
          title="Post your strongest gym image here"
          description="Use a wide, dramatic photo of the finished weight floor, preferably with one athlete lifting. Leave darker open space on the left for headline text."
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
          <a className="text-link" href="#gallery">
            Follow the build-out <span>→</span>
          </a>
        </div>
      </section>

      <section className="feature-grid section" id="training">
        <article className="feature-card feature-card--wide">
          <h3>Strength Floor</h3>
          <p>Racks, platforms, free weights, and equipment built for progress.</p>
          <PhotoBlock
            label="Facility photo · 3:2"
            title="Wide equipment-floor photo"
            description="Shoot from a corner so the room looks large. Turn on every light and straighten all equipment first."
            imageSrc="/photos/fitness-foto.jpeg"
            imageAlt="Southern Iron Fitness weight floor with benches, dumbbells, and machines"
            imagePosition="center"
            className="feature-photo feature-photo--wide"
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
          <Image
            className="membership-stamp"
            src="/brand/southern-iron-founders.png"
            alt="Southern Iron Founders Woodworth, LA"
            width={1774}
            height={887}
          />
          <p className="eyebrow">Powered by Gymdesk</p>
          <h2>Train with us from day one.</h2>
          <p>
            Southern Iron Fitness is opening for people who want a real place
            to work, grow, and stay consistent. Claim your spot early and help
            build the strongest training community in Woodworth.
          </p>
          <ul>
            <li>Founding members get first access before launch</li>
            <li>Built for strength training, discipline, and accountability</li>
            <li>Local gym energy without the crowded big-box feel</li>
            <li>Simple signup through Gymdesk</li>
          </ul>
        </div>
        <div className="gymdesk-embed">
          <span className="embed-tag">Southern Iron Founders</span>
          <h3>Membership options</h3>
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
            <span>Day Pass: $10</span>
            <span>Guest Pass: $5</span>
          </div>
          <div className="service-rates">
            <strong>Service and group rates</strong>
            <p>Available for groups of 8 or more, first responders, veterans, active military, law enforcement, fire, EMS, EMTs, paramedics, and nurses.</p>
            <div>
              <span>Single $30/mo</span>
              <span>Couple $40/mo</span>
              <span>Family $65/mo</span>
            </div>
          </div>
          <a className="gymdesk-action" href={gymdeskUrl} target="_blank" rel="noreferrer">
            Continue in Gymdesk →
          </a>
          <p className="embed-note">
            Members and founding sign-ups can use the Gymdesk portal.
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
        <p className="eyebrow">Strength starts with a decision</p>
        <h2>Be here from day one.</h2>
        <p>
          Join the early-access list and get opening updates, founding
          membership details, and pre-launch offers.
        </p>
        <div className="button-row button-row--center">
          <a className="button" href={gymdeskUrl} target="_blank" rel="noreferrer">
            Join Through Gymdesk
          </a>
          <a className="button button--outline" href="mailto:info@southernironfitness.com">
            Ask a Question
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
          <a href="#">Instagram</a>
          <a href="#">Facebook</a>
          <a href={gymdeskUrl} target="_blank" rel="noreferrer">Member Login</a>
        </div>
      </footer>
    </main>
  );
}

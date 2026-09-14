import Image from "next/image";
import {
  ArrowDown,
  ArrowUpRight,
  Heart,
  MapPin,
  Mountain,
  Sparkles,
  Timer,
  MoveUp,
  Volume1,
} from "lucide-react";
import Hero from "@/components/Hero";
import RetailerFinder from "@/components/RetailerFinder";
import ProductVideo from "@/components/ProductVideo";
import CookieConsent from "@/components/CookieConsent";
import { retailers } from "@/data/retailers";

export default function Home() {
  return (
    <>
      <header className="site-header shell">
        <a href="#" className="wordmark" aria-label="Globi-Vulkan Startseite">
          <Image src="/assets/globi-vulkan-logo.svg" alt="Globi Vulkan" width={2405} height={349} className="wordmark-logo" preload />
        </a>
        <nav aria-label="Hauptnavigation">
          <a href="#globi-vulkan">Der Vulkan</a>
          <a href="#erleben">Das Erlebnis</a>
          <a className="nav-cta" href="#verkaufsstellen">
            <MapPin size={16} /> Verkaufsstellen <ArrowUpRight size={16} />
          </a>
        </nav>
      </header>
      <main id="hauptinhalt">
        <Hero>
          <div className="hero-message hero-message-first">
            <h1>
              Ein Vulkan.
              <br />
              Goldene
              <br />
              <span>Momente.</span>
            </h1>
            <p>
              Unser Globi. Ein Schweizer Original.
              <br /> Leise. Rund 60 Sekunden Gold und Silber.
            </p>
          </div>
          <div className="hero-message hero-message-second" aria-hidden="true">
            <h2>
              Rundherum
              <br />
              ein echtes
              <br />
              <span>Original.</span>
            </h2>
            <p>
              Globi, seine Schweizer Fahne und viel Vorfreude.
              <br /> Entdecke deinen Globi von allen Seiten.
            </p>
          </div>
          <div className="hero-message hero-message-third" aria-hidden="true">
            <h2>
              Erst ein Licht.
              <br />
              Dann ganz
              <br />
              <span>viel Wow.</span>
            </h2>
            <p>
              Ein helles Bengalfeuer. Eine goldene Fontäne.
              <br /> Und Silberfunken, die den Abend verzaubern.
            </p>
            <small>
              Illustrative Darstellung · Den echten Effekt siehst du im Film.
            </small>
          </div>
        </Hero>

        <div className="promise-strip">
          <div className="shell">
            <span>
              <Mountain size={22} /> In der Schweiz hergestellt
            </span>
            <span>
              <Sparkles size={22} /> Goldene Fontäne & Silberfunken
            </span>
            <span>
              <Heart size={22} /> Ein Original mit Globi
            </span>
          </div>
        </div>

        <section
          className="experience shell"
          id="erleben"
          aria-labelledby="experience-title"
        >
          <div className="experience-heading">
            <div>
              <p className="eyebrow">Vorfreude in Bewegung</p>
              <h2 id="experience-title">
                Klein anfangen.
                <br />
                <span>Gross staunen.</span>
              </h2>
            </div>
            <p>
              Goldener Vulkan mit Silberfunken und einer Brenndauer von rund 60
              Sekunden. Die Fontäne steigt bis etwa sechs Meter hoch und
              kombiniert warme Goldfunken mit hellen Silberakzenten.
            </p>
          </div>
          <dl className="product-facts" aria-label="Produktdetails">
            <div>
              <dt>
                <Timer size={18} aria-hidden="true" /> Brenndauer
              </dt>
              <dd>
                60 <span>Sekunden</span>
              </dd>
            </div>
            <div>
              <dt>
                <MoveUp size={18} aria-hidden="true" /> Effekthöhe
              </dt>
              <dd>
                6 <span>m</span>
              </dd>
            </div>
            <div>
              <dt>
                <Volume1 size={18} aria-hidden="true" /> Lautstärke
              </dt>
              <dd>Leise</dd>
            </div>
          </dl>
          <div className="experience-grid">
            <ProductVideo />
            <div className="effect-story">
              <div className="effect-step">
                <span>01</span>
                <div>
                  <h3>Ein leuchtender Auftakt.</h3>
                  <p>
                    Den Anfang macht ein helles Bengalfeuer. Die Vorfreude
                    leuchtet mit.
                  </p>
                </div>
              </div>
              <div className="effect-step">
                <span>02</span>
                <div>
                  <h3>Gold, das immer höher steigt.</h3>
                  <p>
                    Die goldene Fontäne wird grösser und steigt bis etwa sechs
                    Meter hoch. Ein Moment zum Innehalten.
                  </p>
                </div>
              </div>
              <div className="effect-step">
                <span>03</span>
                <div>
                  <h3>Silberfunken obendrauf.</h3>
                  <p>
                    Feine Silberfunken machen das goldene Schauspiel komplett.
                  </p>
                </div>
              </div>
              <a href="#verkaufsstellen" className="text-link">
                Deinen Globi finden <ArrowUpRight size={18} />
              </a>
            </div>
          </div>
        </section>

        <section className="swiss-story" aria-labelledby="swiss-title">
          <div className="shell swiss-story-inner">
            <div className="swiss-story-symbol" aria-hidden="true"></div>
            <div>
              <p className="eyebrow">Von hier. Für besondere Abende.</p>
              <h2 id="swiss-title">
                Ein kleines Stück Schweiz.
                <br />
                Ein grosses Stück Vorfreude.
              </h2>
            </div>
            <div className="swiss-story-copy">
              <p>
                Der Globi-Vulkan wird in der Schweiz hergestellt. Du findest ihn
                ausschliesslich im ausgewählten Fachhandel – persönlich, ganz in
                deiner Nähe.
              </p>
              <a className="text-link" href="#verkaufsstellen">
                Hier gibt’s deinen Globi <ArrowDown size={17} />
              </a>
            </div>
          </div>
        </section>

        <section
          className="retailers-section shell"
          id="verkaufsstellen"
          aria-labelledby="retailer-title"
        >
          <div className="retailers-heading">
            <div>
              <p className="eyebrow">Die Vorfreude ist näher, als du denkst</p>
              <h2 id="retailer-title">
                Wo gibt’s
                <br />
                <span>meinen Globi?</span>
              </h2>
            </div>
            <p>
              Bei ausgewählten Feuerwerks-Händlern
              <br /> in der ganzen Schweiz. Finde deinen.
            </p>
          </div>
          <RetailerFinder retailers={retailers} />
        </section>
      </main>
      <footer className="site-footer">
        <div className="shell footer-top">
          <a href="#" className="wordmark">
            <Image src="/assets/globi-vulkan-logo-light.svg" alt="Globi Vulkan" width={2405} height={349} className="wordmark-logo" />
          </a>
          <p>Ein Vulkan. Goldene Momente.</p>
          <a className="back-top" href="#">
            Zurück nach oben <ArrowUpRight size={17} />
          </a>
        </div>
        <div className="shell footer-bottom">
          <p>
            Globi ist eine geschützte Marke von Orell Füssli AG.
            <br /> © Orell Füssli AG · Globi Verlag, Imprint Orell Füssli
            Verlag, Zürich
          </p>
          <CookieConsent />
          <span>
            Mit Globi. Aus der Schweiz.{" "}
            <span className="footer-cross" aria-hidden="true"></span>
          </span>
        </div>
      </footer>
    </>
  );
}

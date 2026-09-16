import { Panel, Reveal } from "@/components/ui";

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl py-12 md:py-20">
      <Reveal>
        <h1 className="display text-4xl font-medium tracking-tight text-fg md:text-5xl">
          Terms of Service
        </h1>
        <p className="mt-4 text-lg text-fg3">
          Last updated: September 2026
        </p>
      </Reveal>

      <Reveal delay={60}>
        <Panel className="mt-12 space-y-8 p-6 md:p-10">
          <section>
            <h2 className="text-xl font-medium text-fg">1. Eligibility</h2>
            <p className="mt-3 text-fg3 leading-relaxed">
              You must be at least 13 years old and a student or professional interested in hackathons to use HackMate. 
              By using our service, you represent and warrant that you meet these requirements.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-fg">2. Acceptable Use</h2>
            <p className="mt-3 text-fg3 leading-relaxed">
              You agree not to use HackMate to:
            </p>
            <ul className="mt-3 list-disc pl-5 text-fg3 space-y-2">
              <li>Violate any laws or regulations.</li>
              <li>Harass, abuse, or harm another person.</li>
              <li>Impersonate or misrepresent your affiliation with any person or entity.</li>
              <li>Interfere with or disrupt the services or servers.</li>
              <li>Scrape or collect data from our service without permission.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-medium text-fg">3. Team Collaboration</h2>
            <p className="mt-3 text-fg3 leading-relaxed">
              HackMate facilitates connections between individuals for hackathon teams. We are not responsible for the 
              actions, disputes, or performance of any team formed through our platform. Users are expected to maintain 
              professional and respectful conduct when collaborating.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-fg">4. Hackathon Discovery</h2>
            <p className="mt-3 text-fg3 leading-relaxed">
              We aggregate hackathon data from third-party providers (e.g., Unstop, Devfolio, Hack2Skill). We do not 
              guarantee the accuracy, completeness, or availability of this information. Registration and participation 
              in any hackathon are subject to the terms and conditions of the respective organizers and platforms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-fg">5. Disclaimers</h2>
            <p className="mt-3 text-fg3 leading-relaxed">
              HackMate is provided &quot;as is&quot; without warranties of any kind, whether express or implied. We do not 
              warrant that the service will be uninterrupted, secure, or error-free.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-fg">6. Governing Law</h2>
            <p className="mt-3 text-fg3 leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the applicable jurisdiction, 
              without regard to its conflict of law provisions.
            </p>
          </section>
        </Panel>
      </Reveal>
    </div>
  );
}

import { Panel, Reveal } from "@/components/ui";

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl py-12 md:py-20">
      <Reveal>
        <h1 className="display text-4xl font-medium tracking-tight text-fg md:text-5xl">
          Privacy Policy
        </h1>
        <p className="mt-4 text-lg text-fg3">
          Last updated: September 2026
        </p>
      </Reveal>

      <Reveal delay={60}>
        <Panel className="mt-12 space-y-8 p-6 md:p-10">
          <section>
            <h2 className="text-xl font-medium text-fg">1. Data Collected</h2>
            <p className="mt-3 text-fg3 leading-relaxed">
              We collect information you provide directly to us, such as when you create or modify your profile, 
              participate in a hackathon team, request a collaboration, or communicate with other users. This may 
              include your name, email address, username, avatar, college, GitHub/LeetCode handles, and other 
              profile information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-fg">2. How We Use It</h2>
            <p className="mt-3 text-fg3 leading-relaxed">
              We use the information we collect to provide, maintain, and improve our services. We use it to match 
              you with compatible hackathon teams, process collaboration requests, and enable real-time messaging 
              between team members. We may also use it to send you technical notices, updates, and security alerts.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-fg">3. Third-Party Services</h2>
            <p className="mt-3 text-fg3 leading-relaxed">
              We integrate with various third-party services to enhance your experience:
            </p>
            <ul className="mt-3 list-disc pl-5 text-fg3 space-y-2">
              <li><strong>Authentication & Database:</strong> Supabase and Neon PostgreSQL for secure data storage.</li>
              <li><strong>Real-time Infrastructure:</strong> Pusher for real-time messaging and notifications.</li>
              <li><strong>Profile Aggregation:</strong> GitHub and LeetCode APIs to fetch public developer metrics.</li>
              <li><strong>Hackathon Aggregation:</strong> Unstop, Devfolio, and Hack2Skill for discovering hackathons.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-medium text-fg">4. Retention & Security</h2>
            <p className="mt-3 text-fg3 leading-relaxed">
              We store your data as long as your account is active. Direct messages are encrypted at rest using 
              pgcrypto. We take reasonable measures to help protect information about you from loss, theft, misuse 
              and unauthorized access, disclosure, alteration and destruction.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-fg">5. Contact Us</h2>
            <p className="mt-3 text-fg3 leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us at privacy@hackmate.app.
            </p>
          </section>
        </Panel>
      </Reveal>
    </div>
  );
}

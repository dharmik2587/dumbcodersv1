import { Panel, Reveal } from "@/components/ui";

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl py-12 md:py-20">
      <Reveal>
        <h1 className="display text-4xl font-medium tracking-tight text-fg md:text-5xl">
          About HackMate
        </h1>
        <p className="mt-4 text-lg text-fg3">
          The ultimate platform for discovering hackathons and finding the perfect teammates.
        </p>
      </Reveal>

      <Reveal delay={60}>
        <Panel className="mt-12 space-y-8 p-6 md:p-10">
          <section>
            <h2 className="text-xl font-medium text-fg">Our Mission</h2>
            <p className="mt-3 text-fg3 leading-relaxed">
              HackMate was built to solve the biggest friction point in the hackathon ecosystem: finding reliable, 
              skilled teammates with complementary skill sets. We aim to connect developers, designers, and product 
              visionaries so they can build incredible projects together.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-fg">The Platform</h2>
            <p className="mt-3 text-fg3 leading-relaxed">
              We aggregate the best hackathons from across the web and provide a seamless matchmaking experience. 
              Our platform features:
            </p>
            <ul className="mt-3 list-disc pl-5 text-fg3 space-y-2">
              <li><strong>Unified Discovery:</strong> All major hackathons in one place.</li>
              <li><strong>Smart Matchmaking:</strong> Find teammates based on skills, roles, and availability.</li>
              <li><strong>Real-time Collaboration:</strong> Chat and organize with your team instantly.</li>
              <li><strong>Verified Profiles:</strong> Integration with GitHub and LeetCode to showcase true builder stats.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-medium text-fg">Acknowledgements</h2>
            <p className="mt-3 text-fg3 leading-relaxed">
              We are grateful to our data providers and ecosystem partners who make this platform possible:
            </p>
            <ul className="mt-3 list-disc pl-5 text-fg3 space-y-2">
              <li><strong>Unstop</strong></li>
              <li><strong>Devfolio</strong></li>
              <li><strong>Hack2Skill</strong></li>
            </ul>
            <p className="mt-3 text-sm text-fg3">
              HackMate operates as an independent discovery and matchmaking layer. All hackathon registrations 
              are processed directly on the respective organizer platforms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-fg">Get Involved</h2>
            <p className="mt-3 text-fg3 leading-relaxed">
              HackMate is built by hackers, for hackers. If you have feedback, feature requests, or want to contribute 
              to the platform, we&apos;d love to hear from you. Let&apos;s build the future of collaborative hackathons together!
            </p>
          </section>
        </Panel>
      </Reveal>
    </div>
  );
}

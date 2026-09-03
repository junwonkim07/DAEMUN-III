import type { Person, SiteData } from "./schemas";

/**
 * DAEMUN III — default conference content.
 *
 * Two jobs:
 *  1. `packages/db` seeds an empty database from this object (ids are kept).
 *  2. `apps/web` falls back to it if the API is unreachable, so the public
 *     site never goes blank.
 *
 * Once the database is seeded, edit content in the admin panel — not here.
 */

const p = (
  id: string,
  name: string,
  role: string,
  section: Person["section"],
  extra: Partial<Person> = {},
): Person => ({
  id,
  name,
  role,
  photo: null,
  greeting: null,
  section,
  departmentId: null,
  committeeId: null,
  sortOrder: 0,
  ...extra,
});

/** Joins paragraphs into one greeting; rendered as separate <p> elements. */
const g = (...paragraphs: string[]) => paragraphs.join("\n\n");

const director = p("ted-kim", "Ted Kim", "Director", "director", {
  photo: "/profiles/ted-kim.jpg",
});

const executives: Person[] = [
  p("lee-suhyeon", "Suhyeon Lee", "Secretary-General", "executive", {
    photo: "/profiles/lee-suhyeon.jpg",
    sortOrder: 0,
    greeting: g(
      "Honorable delegates and esteemed guests,",
      "My name is Suhyeon Lee, and I am a senior at Qingdao Daewon School. It is my great honor to welcome you to DAEMUN III as Secretary-General.",
      "Over the past few months, our Secretariat has done its utmost to prepare a meaningful and memorable Model United Nations experience. With that work behind us, we are excited to welcome passionate and thoughtful delegates who are ready to challenge themselves and engage in international discourse.",
      "This year’s theme, From Vulnerability to Voice, embodies the importance of every individual voice. To that end, we sincerely hope that DAEMUN will go beyond a forum for discussion and become a valuable opportunity for meaningful learning and personal growth — a place where everyone can speak up and be heard.",
    ),
  }),
  p("choi-boyun", "Boyun Choi", "Deputy Secretary-General", "executive", {
    photo: "/profiles/choi-boyun.jpg",
    sortOrder: 1,
    greeting: g(
      "Welcome to DAEMUN III,",
      "My name is Boyun Choi, and I am a senior at Qingdao Daewon School. It is my great privilege to welcome you to DAEMUN III as the Deputy Secretary-General.",
      "Preparing for DAEMUN III has been a rewarding journey of months of dedication, teamwork, and careful planning. As a member of the Secretariat, I have had the opportunity to work alongside an incredible team that shares the same passion for creating a meaningful and inspiring conference. Seeing our efforts come together has made me even more excited to welcome each of you. I hope DAEMUN III becomes a place where every delegate feels empowered to speak with confidence, listen with empathy, and grow through meaningful collaboration.",
      "May this conference inspire you to transform your ideas into action and your voice into meaningful change. I sincerely wish you an enriching and unforgettable experience at DAEMUN III.",
      "Welcome, and best of luck throughout the conference.",
    ),
  }),
];

const departments: SiteData["secretariat"]["departments"] = [
  {
    id: "technology",
    name: "Technology",
    blurb: "Website, systems and conference tooling",
    sortOrder: 0,
    members: [
      p("kim-junwon", "Junwon Kim", "Head of Technology", "department", {
        photo: "/profiles/kim-junwon.jpg",
        departmentId: "technology",
        sortOrder: 0,
        greeting: g(
          "Hello,",
          "I’m Junwon Kim, a senior at Qingdao Daewon School. I am truly grateful for the opportunity to lead the Technology Department this year.",
          "Our team is committed to supporting every delegate and participant through a cloud system built specifically for this conference. It is designed to streamline communication, simplify document sharing, and keep every session running smoothly.",
          "We believe a well-built technical foundation lets delegates focus on what actually matters — debate and diplomacy — rather than on logistics. Our team will keep working behind the scenes so that DAEMUN III runs without a hitch.",
          "We look forward to welcoming and supporting all of you at DAEMUN III!",
        ),
      }),
      p("kim-minchan-b", "Minchan Kim", "Deputy Head of Technology", "department", {
        photo: "/profiles/kim-minchan-b.jpg",
        departmentId: "technology",
        sortOrder: 1,
        greeting: g(
          "Hi everyone, welcome to DAEMUN III!",
          "I’m Minchan Kim, a senior at Qingdao Daewon School, and I’m really happy to be part of the Technology Department this year.",
          "You won’t see us at the podium — we’re the ones working quietly in the background to build and run the DAEMUN III website, making sure everything from committee information to registration is just a click away. It isn’t the flashiest job, but I love it; I’ve always liked figuring out how to make things work smoothly for other people.",
          "Getting to shape how delegates experience DAEMUN III before the conference even starts has been genuinely rewarding, and I hope it makes your journey a little easier too.",
          "Can’t wait to see you all at DAEMUN III!",
        ),
      }),
    ],
  },
  {
    id: "media",
    name: "Media",
    blurb: "Photography, film and conference coverage",
    sortOrder: 1,
    members: [
      p("hyun-jaehee", "Jaehee Hyun", "Head of Media", "department", {
        photo: "/profiles/hyun-jaehee.jpg",
        departmentId: "media",
        sortOrder: 0,
        greeting: g(
          "Welcome to DAEMUN III,",
          "My name is Jaehee Hyun, and I am deeply honored to serve as the Head of Media for this year’s conference.",
          "The Media Team’s mission is simple but vital: to capture the energy, the debate, and the unforgettable moments of DAEMUN III. Behind every strong resolution and intense debate there are stories worth remembering. Through high-quality photography, engaging video, and creative content, our team will make sure your work and your achievements are beautifully documented.",
          "We are fully committed to making your MUN experience memorable, both inside and outside the committee rooms. I look forward to capturing your finest moments and seeing you all very soon.",
          "Thank you.",
        ),
      }),
      p("mun-jeongyeon", "Jeongyeon Moon", "Deputy Head of Media", "department", {
        photo: "/profiles/mun-jeongyeon.jpg",
        departmentId: "media",
        sortOrder: 1,
      }),
    ],
  },
  {
    id: "press",
    name: "Press",
    blurb: "Written coverage and conference reporting",
    sortOrder: 2,
    members: [
      p("yun-heejin", "Heejin Yun", "Head of Press", "department", {
        photo: "/profiles/yun-heejin.jpg",
        departmentId: "press",
        sortOrder: 0,
        greeting: g(
          "Honorable delegates,",
          "My name is Heejin Yun, and I am a senior at Qingdao Daewon School. It is my honor to serve as the Head of Press for DAEMUN III.",
          "Our Press Team will work to capture the memorable moments, meaningful discussions, and achievements of the conference. We hope our coverage lets everyone look back on this experience with pride and appreciation.",
          "I wish you all the best for the conference, and I look forward to seeing you soon.",
          "Thank you!",
        ),
      }),
    ],
  },
  {
    id: "administration",
    name: "Administration",
    blurb: "Registration, logistics and delegate support",
    sortOrder: 3,
    members: [
      p("park-hayejin", "Hayejin Park", "Head of Administration", "department", {
        photo: "/profiles/park-hayejin.jpg",
        departmentId: "administration",
        sortOrder: 0,
        greeting: g(
          "Dear delegates,",
          "My name is Hayejin Park, and I am a senior at Qingdao Daewon School. It is my pleasure to welcome you to DAEMUN III as the Head of Administration.",
          "The Administration Team works behind the scenes to keep the conference running smoothly and to make sure every delegate is comfortable. Throughout the conference we will do our best to support you, so that you can focus on the discussion, on meeting new people, and on making the most of your time at DAEMUN III.",
          "I hope this conference challenges you, inspires you, and leaves you with meaningful memories. I look forward to meeting all of you soon.",
          "Thank you!",
        ),
      }),
      p("park-jihun", "Jihun Park", "Deputy Head of Administration", "department", {
        photo: "/profiles/park-jihun.jpg",
        departmentId: "administration",
        sortOrder: 1,
      }),
      p("lee-seungwoo", "Seungwoo Lee", "Deputy Head of Administration", "department", {
        photo: "/profiles/lee-seungwoo.jpg",
        departmentId: "administration",
        sortOrder: 2,
      }),
    ],
  },
];

const chairs: Record<string, Person[]> = {
  ecosoc: [
    p("an-jaewoo", "Jaewoo An", "Head Chair", "chair", {
      photo: "/profiles/an-jaewoo.jpg",
      committeeId: "ecosoc",
      sortOrder: 0,
      greeting: g(
        "Hello, delegates!",
        "My name is Jaewoo An, and I am a senior at Qingdao Daewon School. It is my sincere honor to serve as your Head Chair of the Economic and Social Council for DAEMUN III.",
        "ECOSOC lies at the heart of addressing the world’s most pressing economic, social, and humanitarian challenges, and I have no doubt that your ideas will shape meaningful solutions. Model United Nations is not only about drafting resolutions, but about listening, collaborating, and finding common ground through respectful dialogue. Whether you are a seasoned delegate or attending your very first conference, I encourage you to speak up — every voice adds value to our discussions.",
        "As your Head Chair, I promise to create an inclusive and supportive environment where each of you can grow and shine. I look forward to meeting you all!",
      ),
    }),
    p("kim-minchan-a", "Minchan Kim", "Deputy Chair", "chair", {
      photo: "/profiles/kim-minchan-a.jpg",
      committeeId: "ecosoc",
      sortOrder: 1,
      greeting: g(
        "Honorable delegates and esteemed guests,",
        "Hi, my name is Minchan Kim, and I am a senior at Qingdao Daewon School. It is my great honor to welcome you as Deputy Chair of the Economic and Social Council for DAEMUN III.",
        "ECOSOC is where delegates discuss the major global economic and social issues, from sustainable development to international cooperation. I believe Model United Nations is not only about finding solutions, but also about listening to different perspectives, building confidence, and learning to communicate respectfully.",
        "As Deputy Chair, I will do my best to create a welcoming and productive environment where delegates feel encouraged to speak, participate, and challenge themselves.",
        "I look forward to meeting all of you at the conference.",
      ),
    }),
    p("heo-yeji", "Yeji Heo", "Deputy Chair", "chair", {
      photo: "/profiles/heo-yeji.jpg",
      committeeId: "ecosoc",
      sortOrder: 2,
      greeting: g(
        "Hello, delegates!",
        "My name is Yeji Heo, and I am a senior at Qingdao Daewon School. I am truly honored to serve as your Deputy Chair of the Economic and Social Council for DAEMUN III.",
        "Model United Nations is much more than debating global issues or drafting resolutions. It is an opportunity to exchange ideas, develop diplomatic skills, and work together on some of the world’s most pressing economic and social challenges. Whether or not this is your first conference, I hope you will take this opportunity to strengthen your skills. Meaningful debate is built not only on strong arguments but also on mutual respect and genuine collaboration.",
        "As your Deputy Chair, I am committed to maintaining a professional, fair, and engaging committee where every delegate feels encouraged to participate.",
        "I wish you the very best in your preparation, and I look forward to meeting all of you at DAEMUN III!",
      ),
    }),
  ],
  unoosa: [
    p("park-sinhu", "Shinhoo Park", "Head Chair", "chair", {
      photo: "/profiles/park-sinhu.jpg",
      committeeId: "unoosa",
      sortOrder: 0,
      greeting: g(
        "Hello, delegates!",
        "My name is Shinhoo Park, and I am a senior at Qingdao Daewon School. It is my utmost honor to serve as your Head Chair of the United Nations Office for Outer Space Affairs at DAEMUN III.",
        "If this is your first MUN conference, I understand that it may feel overwhelming. Please remember that the purpose of MUN is not simply to win, but to learn from others and to exchange perspectives.",
        "As your Head Chair, I will do my best to make sure every delegate feels comfortable participating. If you are already a seasoned delegate, I hope you will help guide others, so that we can create a more fruitful conference together.",
        "Thank you.",
      ),
    }),
    p("lee-junwoo", "Junwoo Lee", "Deputy Chair", "chair", {
      photo: "/profiles/lee-junwoo.jpg",
      committeeId: "unoosa",
      sortOrder: 1,
      greeting: g(
        "Honorable delegates and esteemed guests,",
        "My name is Junwoo Lee, and I am a senior at Qingdao Daewon School. It is my true honor to welcome you to DAEMUN III as Deputy Chair of UNOOSA.",
        "Model United Nations brings students together to deepen their understanding of international relations, the problems the world faces, and the solutions available to it. This conference is far more than committee sessions and resolutions. It is a space for ideas to be challenged, perspectives to be shared, and leadership to be developed.",
        "Everyone here — delegate, chair, admin, and press member — plays a critical role in creating a productive environment for debate. As Deputy Chair, I will do my best to foster an inclusive and comfortable session. I would like to thank everyone taking part, and I hope we can share a great experience together.",
        "I look forward to seeing all of you at the conference.",
      ),
    }),
    p("jo-minji", "Minji Choi", "Deputy Chair", "chair", {
      photo: "/profiles/jo-minji.jpg",
      committeeId: "unoosa",
      sortOrder: 2,
    }),
  ],
};

const tbaTopics = (committeeId: string) =>
  [0, 1, 2, 3].map((i) => ({
    id: `${committeeId}-topic-${i + 1}`,
    committeeId,
    title: "TBA",
    summary: "",
    report: null,
    sortOrder: i,
  }));

export const defaultSite: SiteData = {
  conference: {
    name: "DAEMUN III",
    org: "Daewon Model United Nations",
    theme: "From Vulnerability to Voice",
    session: "Third Session",
    dates: "TBA",
    venue: "TBA",
    email: "TBA",
    instagram: "TBA",
    instagramUrl: "#",
    address: "TBA",
    firstHeld: "November 2024",
    aboutLead:
      "DAEMUN is a student-led Model United Nations where students explore various issues in the international community and seek practical and implementable solutions.",
    aboutBody:
      "Through discussions and collaboration, DAEMUN provides participants with opportunities to develop critical thinking skills, diplomatic communication abilities, and global leadership. We aim to bring together students from diverse backgrounds and perspectives to discuss global issues in depth, creating meaningful change for a better future based on respect and cooperation.",
    themeLead:
      "“From Vulnerability to Voice” emphasizes the importance of multilateral cooperation in developing isolated vulnerabilities into voices for dialogue, solidarity, and change.",
    themeBody:
      "In this year’s conference, students will be respecting diverse perspectives, representing vulnerable communities, and exploring how even a small voice can result in meaningful transformations in the international community.",
  },

  secretariat: { director, executives, departments, chairs },

  committees: [
    {
      id: "ecosoc",
      slug: "ecosoc",
      code: "ECOSOC",
      name: "Economic and Social Council",
      image: "/committees/ecosoc.jpg",
      description:
        "The principal body for coordination, policy review, policy dialogue and recommendations on economic, social and environmental issues.",
      sourceLabel: "ecosoc.un.org/en/about-us",
      sourceUrl: "https://ecosoc.un.org/en/about-us",
      sortOrder: 0,
      topics: tbaTopics("ecosoc"),
    },
    {
      id: "unoosa",
      slug: "unoosa",
      code: "UNOOSA",
      name: "United Nations Office for Outer Space Affairs",
      image: "/committees/unoosa.jpg",
      description:
        "Promotes international cooperation in the peaceful use and exploration of space, and the use of space science and technology for sustainable development.",
      sourceLabel: "unoosa.org/oosa/en/aboutus",
      sourceUrl: "https://www.unoosa.org/oosa/en/aboutus/index.html",
      sortOrder: 1,
      topics: tbaTopics("unoosa"),
    },
  ],

  resolutions: { ecosoc: [], unoosa: [] },

  schedule: [
    {
      id: "day-1",
      day: "Day One",
      date: "TBA",
      sortOrder: 0,
      items: [
        { id: "day-1-1", dayId: "day-1", time: "TBA", event: "Registration & Opening Ceremony", sortOrder: 0 },
        { id: "day-1-2", dayId: "day-1", time: "TBA", event: "Committee Session I", sortOrder: 1 },
        { id: "day-1-3", dayId: "day-1", time: "TBA", event: "Committee Session II", sortOrder: 2 },
      ],
    },
    {
      id: "day-2",
      day: "Day Two",
      date: "TBA",
      sortOrder: 1,
      items: [
        { id: "day-2-1", dayId: "day-2", time: "TBA", event: "Committee Session III", sortOrder: 0 },
        { id: "day-2-2", dayId: "day-2", time: "TBA", event: "Resolution Debate & Voting", sortOrder: 1 },
        { id: "day-2-3", dayId: "day-2", time: "TBA", event: "Closing Ceremony & Awards", sortOrder: 2 },
      ],
    },
  ],

  documents: [
    {
      id: "clauses",
      title: "Preambulatory & Operative Clauses",
      blurb: "The full vocabulary list for writing resolutions",
      file: "/docs/daemun-iii-clauses.pdf",
      kind: "PDF",
      size: "465 KB",
      sortOrder: 0,
    },
    {
      id: "rop",
      title: "Rules of Procedure for Delegates",
      blurb: "The full ROP as used at DAEMUN III",
      file: "/docs/daemun-iii-rop.docx",
      kind: "DOC",
      size: "148 KB",
      sortOrder: 1,
    },
    {
      id: "resolution-template",
      title: "Resolution Template",
      blurb: "The blank format to write your own resolution in",
      file: "/docs/daemun-iii-resolution-template.docx",
      kind: "DOC",
      size: "150 KB",
      sortOrder: 2,
    },
    {
      id: "resolution-example",
      title: "Resolution Example",
      blurb: "A complete worked resolution to model yours on",
      file: "/docs/daemun-iii-resolution-example.docx",
      kind: "DOC",
      size: "2.8 MB",
      sortOrder: 3,
    },
    {
      id: "resolution-example-2",
      title: "Resolution Example 2",
      blurb: "A second worked example from a different committee",
      file: "/docs/daemun-iii-resolution-example-2.docx",
      kind: "DOC",
      size: "3.4 MB",
      sortOrder: 4,
    },
    {
      id: "speech-template",
      title: "Introduction Speech Template",
      blurb: "A structure for your opening speech on the speakers’ list",
      file: "/docs/daemun-iii-speech-template.docx",
      kind: "DOC",
      size: "142 KB",
      sortOrder: 5,
    },
  ],
};

import { percentageToStars, formatStars } from "./hkdse-stars";

export { percentageToStars, formatStars };

const DEMO_W1_EMAIL =
  "Dear students,\n\nI am writing to explain our new quiet study room, which will open after lessons from next Monday. The room is on the second floor near the library. It is for silent revision only — no food, no phone calls and no group chatting.\n\nTo book a seat, use the student portal before 4 p.m. on the day you need it. Each session lasts forty-five minutes. Please leave the room tidy and switch off the lights when you finish.\n\nUse the room responsibly so everyone can focus. If we respect the rules together, the study room will help us prepare for the HKDSE more effectively.\n\nChris Wong\nChairperson, Student Union";

const DEMO_W2_ESSAY =
  "Homework should be redesigned rather than simply reduced. Many students already feel overloaded, but cutting homework without changing its purpose may weaken learning habits. A better approach is to assign tasks that connect classroom ideas to real life.\n\nFor example, instead of repeating grammar drills, teachers could ask students to interview a family member about a local issue and write a short reflection. Such tasks develop research skills, critical thinking and communication. They also feel more meaningful than copying notes.\n\nRedesign does not mean making school easier. It means making work purposeful. When homework helps students practise skills they will need in society, families are more likely to support it.\n\nSchools should therefore review homework policies regularly. Teachers, students and parents should discuss what kinds of tasks truly support learning. Redesign, not reduction, is the sustainable way to improve homework in Hong Kong.";

/** Map raw percentage to an approximate HKDSE English level for practice reporting. */
export function percentageToBand(pct: number): string {
  if (pct >= 88) return "5**";
  if (pct >= 80) return "5*";
  if (pct >= 70) return "5";
  if (pct >= 60) return "4";
  if (pct >= 50) return "3";
  if (pct >= 40) return "2";
  return "1";
}

export function buildHkdseEnglishDemoPayload() {
  return {
    title: "HKDSE English Practice Set",
    sections: [
      {
        id: "R",
        title: "Paper 1 Reading",
        minutes: 90,
        marks: 20,
        passage: `Part A: Reclaiming the Lunch Hour

At North Point Community College, the busiest room at lunchtime used to be the library. Students rushed in to finish homework, charge phones and scroll through messages before afternoon lessons. Last September, the student council proposed a different use for the hour: a weekly "micro-club" programme. Every Wednesday, classrooms would become small activity spaces run by students. The rule was simple. A club had to teach one practical skill in twenty minutes and leave ten minutes for reflection.

The idea sounded modest, but the results surprised teachers. The calligraphy club attracted students who usually avoided Chinese cultural activities because the first session focused on designing cafe signs. The coding club taught Form Five students how to build revision timers. A group of newly arrived students hosted a "Hong Kong transport survival" session, comparing the MTR, minibuses and ferries. The programme did not remove academic pressure, but it changed the social texture of the school. Students who rarely spoke in class became experts for a short time.

Part B: When Volunteering Becomes a Habit

Many schools encourage students to volunteer, but one youth centre in Sha Tin argues that hours alone are a poor measure of service. Its coordinator, Ms Lau, asks students to return to the same project for at least six weeks. "A single visit can be inspiring," she says, "but commitment teaches students to notice patterns." In one project, students helped elderly residents organise digital photos. At first, the teenagers assumed the task was technical. By the third week, they realised the residents mainly wanted patient listeners.

The centre now records reflection notes instead of only counting attendance. Students write what changed, what confused them and what they would do differently next time. According to Ms Lau, the best reflections are not the most sentimental. They are specific. One student wrote that he had learned to slow down when explaining phone settings because "being quick made me look competent, but being clear made me useful."`,
        questions: [
          {
            id: "R1",
            prompt: "What was the original common use of the library during lunchtime?",
            marks: 2,
            type: "mcq",
            options: [
              "Club meetings",
              "Homework and phone use",
              "Teacher consultations",
              "Cultural workshops",
            ],
            answer: "1",
          },
          {
            id: "R2",
            prompt: "State the main rule of the micro-club programme.",
            marks: 2,
            type: "short_text",
            answer:
              "Teach one practical skill in twenty minutes and leave ten minutes for reflection.",
          },
          {
            id: "R3",
            prompt: "Which word best describes the scale of the original proposal?",
            marks: 2,
            type: "mcq",
            options: ["Ambitious", "Modest", "Expensive", "Compulsory"],
            answer: "1",
          },
          {
            id: "R4",
            prompt: "Why did the calligraphy club attract unexpected interest?",
            marks: 2,
            type: "short_text",
            answer:
              "It linked calligraphy to designing cafe signs, making it feel practical and modern.",
          },
          {
            id: "R5",
            prompt: "According to the passage, what changed in the school's social texture?",
            marks: 2,
            type: "short_text",
            answer:
              "Quiet students could become experts and speak with confidence for a short time.",
          },
          {
            id: "R6",
            prompt: "What does Ms Lau believe is a weak measure of service?",
            marks: 2,
            type: "mcq",
            options: [
              "Reflection quality",
              "The number of service hours",
              "Project duration",
              "Student attitude",
            ],
            answer: "1",
          },
          {
            id: "R7",
            prompt: "Why does Ms Lau prefer students to return to the same project?",
            marks: 2,
            type: "short_text",
            answer:
              "Repeated visits help students notice patterns and understand needs more deeply.",
          },
          {
            id: "R8",
            prompt:
              "What did students eventually learn about helping elderly residents with photos?",
            marks: 2,
            type: "short_text",
            answer: "The residents mainly wanted patient listeners, not just technical help.",
          },
          {
            id: "R9",
            prompt: "Which reflections does Ms Lau value most?",
            marks: 2,
            type: "mcq",
            options: [
              "Long and emotional reflections",
              "Short attendance records",
              "Specific reflections",
              "Reflections written by teachers",
            ],
            answer: "2",
          },
          {
            id: "R10",
            prompt:
              "Explain the contrast in the final quotation between looking competent and being useful.",
            marks: 2,
            type: "short_text",
            answer:
              "Speed can impress others, but clear patient explanation helps the other person more.",
          },
        ],
      },
      {
        id: "W",
        title: "Paper 2 Writing",
        minutes: 120,
        marks: 25,
        questions: [
          {
            id: "W1",
            prompt:
              "Part A: You are Chris Wong, Chairperson of the Student Union. Your school plans to open a quiet study room after lessons. Write an email to students explaining the new arrangement, the booking rules and why students should use the room responsibly. Write about 200 words.",
            marks: 10,
            type: "short_text",
            rubric:
              "Award marks for clear purpose, relevant details, appropriate email format, polite tone and accurate language.",
            answer: DEMO_W1_EMAIL,
          },
          {
            id: "W2",
            prompt:
              "Part B: Choose one question and write about 400 words. You may write an article, speech or essay as instructed.",
            marks: 15,
            type: "essay",
            essay_prompts: [
              "Learning: Write an article for your school magazine about whether homework should be redesigned rather than reduced.",
              "Technology: Write an essay discussing whether artificial intelligence will make students more independent learners.",
              "Community: Write a speech encouraging teenagers to take part in long-term volunteer work.",
              "Culture: Write a feature article about a local tradition that should be introduced to more young people.",
            ],
            rubric:
              "Award marks for content development, organisation, audience awareness, vocabulary range, grammar accuracy and register.",
            answer: DEMO_W2_ESSAY,
          },
        ],
      },
      {
        id: "L",
        title: "Paper 3 Listening & Integrated Skills",
        minutes: 120,
        marks: 30,
        listening_script: `You will hear a conversation between Ms Chan, the teacher adviser for the Environmental Society, and two students, Jayden and Mira, who are planning a Green Week at school.

Ms Chan: Thanks for coming. The principal likes your proposal, but she wants the week to feel practical, not just decorative. Tell me the main aim.

Jayden: We want students to reduce single-use plastic on campus. Our survey showed that most students care about waste, but they forget to bring reusable containers.

Mira: So we are not starting with a lecture. On Monday we will set up a refill station outside the tuck shop. Students who bring a bottle can get fruit tea for three dollars instead of six.

Ms Chan: Good. Incentives are useful. What about Tuesday?

Jayden: Tuesday is the repair corner. The Design and Technology teachers agreed to help students fix small items, like loose bag straps and broken pencil cases. We will also show short videos about repairing instead of replacing.

Ms Chan: Remember safety. No electrical appliances.

Mira: Noted. Wednesday is our data day. We will display the amount of plastic collected from bins before and during Green Week. We want the numbers to be visible, because students respond better when they see evidence.

Ms Chan: That connects well with integrated learning. Any concerns?

Jayden: Publicity. Posters alone may not work. We plan to ask class representatives to make thirty-second announcements during morning registration.

Mira: We also need volunteers for lunchtime. Each volunteer will work one twenty-minute shift, so they do not miss the whole break.

Ms Chan: Sensible. For Friday, the principal asked whether parents could be involved.

Jayden: We can send a short message through the parent app. It will ask families to discuss one habit they could change at home, such as carrying containers when buying takeaway food.

Ms Chan: Fine. Your final task is to prepare a memo for the principal. Include the aim, the daily activities, safety arrangements, publicity and how you will measure success. Keep the tone formal and practical.`,
        audio_url: "/hkdse-past-papers/2025/paper-3-audio.mp3",
        passage: `Data File

Extract 1: Student Survey Results
- 72% of students say plastic waste is a serious problem.
- 61% forget to bring reusable bottles or containers.
- 48% say rewards would make them try a new habit.
- 34% have repaired an item instead of replacing it in the past year.

Extract 2: Principal's Requirements
- Activities must be safe and supervised.
- The campaign should include evidence of impact.
- Parents may be invited to support one simple habit at home.
- Final memo should be formal, concise and action-focused.`,
        questions: [
          {
            id: "L1",
            prompt: "What is the main aim of Green Week?",
            marks: 3,
            type: "short_text",
            answer: "To reduce single-use plastic on campus.",
          },
          {
            id: "L2",
            prompt: "What discount will students receive if they bring a reusable bottle?",
            marks: 3,
            type: "mcq",
            options: [
              "Fruit tea for three dollars",
              "Free lunch",
              "A repair coupon",
              "A parent app reward",
            ],
            answer: "0",
          },
          {
            id: "L3",
            prompt: "Which item is not allowed at the repair corner?",
            marks: 3,
            type: "mcq",
            options: [
              "A pencil case",
              "A bag strap",
              "An electrical appliance",
              "A notebook cover",
            ],
            answer: "2",
          },
          {
            id: "L4",
            prompt: "Why will the society display plastic collection data?",
            marks: 3,
            type: "short_text",
            answer: "Students respond better when they can see evidence.",
          },
          {
            id: "L5",
            prompt: "How long will each lunchtime volunteer shift last?",
            marks: 3,
            type: "short_text",
            answer: "Twenty minutes.",
          },
          {
            id: "L6",
            prompt: "Which survey result best supports the Monday refill-station reward?",
            marks: 3,
            type: "mcq",
            options: [
              "72% say plastic waste is serious",
              "61% forget containers",
              "48% say rewards would help",
              "34% repaired an item",
            ],
            answer: "2",
          },
          {
            id: "L7",
            prompt:
              "Write two bullet points for the principal's memo: one about safety and one about measuring success.",
            marks: 6,
            type: "short_text",
            rubric:
              "Award marks for selecting relevant information from both the audio and Data File, and for formal concise wording.",
          },
          {
            id: "L8",
            prompt:
              "Using the audio and Data File, write a 100-200 word memo paragraph recommending Green Week to the principal.",
            marks: 6,
            type: "essay",
            rubric:
              "Award marks for integrating spoken and written information, formal tone, organisation and accurate language.",
          },
        ],
      },
      {
        id: "S",
        title: "Paper 4 Speaking",
        minutes: 20,
        marks: 10,
        passage: `Part A: Group Interaction

This article was recently published online:

Photo-taking visitors not welcomed by everyone

We often take photos of such aspects of everyday life as scenery and food, and we see others posting these kinds of pictures on social media. In some places, however, people are pushing back against this trend.

Vermont, USA
Officials in this town recently voted to close its roads in autumn, when the leaves of the trees turn colour and the area is at its most beautiful. Hundreds of tourists began going there to take photos, and many were parking near people's private homes, damaging property and even arguing with local residents. "Traffic in this area has steadily increased, causing environmental, safety, and quality of life issues," the town reported.

Mount Fuji, Japan
In May 2024, a Japanese town built a wall to block views of Mount Fuji, Japan's most famous mountain. Large groups of tourists started going there to take photos and refused to obey rules on throwing trash and parking. One resident said, "When visitors don't respect rules, leave litter behind and ignore traffic regulations, then as regrettable as it is, we have to take action."

Berlin, Germany
Before opening N&S, one of Germany's top-rated restaurants, owner Billy Wagner set a "no photos, no videos" rule for the place. He mentions two reasons for the rule: privacy for the other diners and appreciation for the food. "I was interested in analogue focus, which is what a restaurant visit is really all about: to smell, taste, feel, see." He felt that the only way that people could have that focus was to put their phones away.

Your group is discussing the issue of taking photos in public places. You may want to talk about:
- why people might not like others taking photos in public places
- places in Hong Kong that are popular for taking photos
- whether Hong Kong needs to have rules for photo taking in public places
- anything else you think is important

Part B: Individual Response
1. Do you like taking photos?
2. Do you like to share photos with friends?
3. Is taking photos a popular hobby among teenagers?
4. Have you ever gone to a place just to take photos?
5. Is taking photos an important part of travelling?
6. Who likes taking photos more: younger people or older people?
7. Can taking photos spoil an experience?
8. Do you think tourism causes disruption to local people?`,
        questions: [
          {
            id: "S1",
            prompt:
              "Part A Group Interaction: Discuss the issue of taking photos in public places with three classmates.",
            marks: 6,
            type: "short_text",
            answer:
              "I think the problem is not simply taking photos, but how people behave when they take them. In Hong Kong, places like the Monster Building, the Tsim Sha Tsui harbourfront, and some old cafes can become crowded because visitors want the same picture. Residents may feel their privacy is being ignored, and shop owners may lose control of the atmosphere.\n\nI agree that rules are needed, but I would avoid a complete ban in most public places. A better balance would be clear signs, no-photo zones near private homes, and reminders not to block entrances or roads. For restaurants, I think owners should be allowed to set their own rules, like the Berlin example, because the dining experience is part of their business.\n\nTo conclude, Hong Kong should still welcome visitors who want to take photos, because photos can promote the city. But we need respectful behaviour. If tourists keep moving, ask before photographing people, and follow local signs, photo-taking can be enjoyable without disturbing residents.",
            rubric:
              "Assess pronunciation and delivery, communication strategies, vocabulary and language patterns, and ideas and organization.",
          },
          {
            id: "S2",
            prompt:
              "Part B Individual Response: Answer the examiner's eight short follow-up questions about photography, travel and tourism.",
            marks: 4,
            type: "short_text",
            answer:
              "Yes, I like taking photos, especially when I travel or spend time with friends. Photos help me remember small details that I might forget later.\n\nI do share photos with friends, but usually only in private chats. I do not post everything online because some moments feel more personal.\n\nYes, I think it is very popular among teenagers because phones make it easy. Many people take photos of food, outfits, concerts, and nice views.\n\nYes, I have gone to the harbourfront and some cafes mainly to take photos. But I try not to block other people or stay too long.\n\nYes, photos are an important part of travelling because they help us remember the trip. However, if we only focus on photos, we may not enjoy the place properly.\n\nI think younger people probably take more photos because they use social media more often. Older people may take fewer photos, but their photos may be more meaningful.\n\nYes, it can spoil an experience if people only care about getting the perfect picture. It can also annoy others if they block paths or make too much noise.\n\nYes, tourism can cause disruption when there are too many visitors in residential areas. But with good rules and respectful behaviour, tourism can still benefit local businesses.",
            rubric: "Assess clear, concise spoken answers using the Paper 4 speaking criteria.",
          },
        ],
      },
    ],
  };
}

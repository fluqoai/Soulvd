export const goals = [
  {
    id: "service",
    title: "أخدم عملائي",
    description: "صندوق محادثات واحد لفريقك، مع تحويل ومتابعة واضحة.",
    href: "/app/explore",
    icon: "message",
  },
  {
    id: "campaigns",
    title: "أطلق حملة",
    description: "استورد جمهورك، جهّز قالبك، ثم راجع الحملة قبل إرسالها.",
    href: "/app/campaigns",
    icon: "campaign",
  },
  {
    id: "automation",
    title: "أجهّز ردودًا تلقائية",
    description: "ترحيب وأسعار ومواعيد؛ ابدأ بوصفة جاهزة وعدّلها.",
    href: "/app/guide?goal=automation",
    icon: "flow",
  },
  {
    id: "assistant",
    title: "أجهّز مساعدًا ذكيًا",
    description: "عرّفه بنشاطك ومعلوماتك وحدود إجاباته قبل تشغيله.",
    href: "/app/guide?goal=assistant",
    icon: "bot",
  },
  {
    id: "integration",
    title: "أربط نظام شركتي",
    description: "صف ما تحتاجه بلغتك؛ لا يلزم أن تعرف API أو قواعد البيانات.",
    href: "/app/guide?goal=integration",
    icon: "link",
  },
] as const;
export const recipes = {
  welcome: {
    title: "ترحيب بالعملاء",
    trigger: "all",
    keywords: [],
    reply: "حياك الله! يسعدنا خدمتك. كيف نقدر نساعدك اليوم؟",
  },
  prices: {
    title: "الأسعار والخدمات",
    trigger: "keywords",
    keywords: ["سعر", "أسعار", "بكم", "تكلفة"],
    reply:
      "حياك الله! اذكر الخدمة التي تهمك، وسيساعدك فريقنا بالتفاصيل والسعر.",
  },
  appointment: {
    title: "طلب موعد",
    trigger: "keywords",
    keywords: ["موعد", "حجز", "احجز"],
    reply:
      "يسعدنا ترتيب موعدك. اذكر اليوم والوقت المناسبين، وسيؤكد فريقنا التوفر. هذه الرسالة ليست تأكيدًا للحجز.",
  },
  human: {
    title: "تحويل إلى موظف",
    trigger: "keywords",
    keywords: ["موظف", "مساعدة", "شكوى"],
    reply: "",
  },
} as const;
export type GuideData = {
  goal: "automation" | "assistant" | "integration";
  business: string;
  recipe: keyof typeof recipes;
  reply: string;
  knowledge: string;
  system: string;
  need: string;
};
export function guideFlow(data: GuideData) {
  const recipe = recipes[data.recipe];
  return {
    name:
      data.goal === "assistant"
        ? `مساعد ${data.business}`.slice(0, 120)
        : recipe.title,
    status: "draft",
    priority: 100,
    definition: {
      trigger: data.goal === "assistant" ? "all" : recipe.trigger,
      keywords: [...recipe.keywords],
      action:
        data.goal === "assistant"
          ? "ai"
          : data.recipe === "human"
            ? "handoff"
            : "text",
      mode: "draft",
      reply: data.reply,
    },
  };
}

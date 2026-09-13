export const GAME_CONFIG = {
  // Background Music Configuration
  music: {
    songTitle: "Level 1 Song",
    songFileUrl: "/audio/level 1 song.mp3",
    volume: 0.30, // 25-35% as requested
  },

  // Birthday Letter Configuration (Easily customizable for personal messages)
  letter: {
    recipientName: "",
    title: "Happy Birthday, Aafraa",
    dateText: "A Very Special Day on a silly island lol",
    paragraphs: [
      "Yeah, yeah, I know it’s been so long and honestly, I seriously don’t even know what to say or how to say it. I don’t know what I’m supposed to do right now. I’m just… blank. There are so many things in my mind, so many things I want to tell you, but somehow, when it comes to actually putting them into words, I have nothing.",
      "Anyway, I just want you to be happy. That’s honestly all I want. I wanna see you smiling, laughing, and enjoying yourself. Please be happy, okay? That’s why I made all of this—for you. Just to make you smile, to make you happy, and to remind you that I’m here for you. I’m here, and I always will be.",
      "I miss you. A lot. I don’t even know how to properly describe how much I miss you. I have so many things to say, so many things I want to share with you. I hope you’re doing great in your exams, in life, and in everything else. I hope everything is okay. I hope you’re eating well, taking care of yourself, and getting enough rest too:)",
      "And honestly, I feel so lucky that I met you. I’m so lucky that I got to know you, talk to you, and share so many beautiful moments together. We’ve had so many memories together, and I genuinely love every single one of them. I love our conversations, our stupid little moments, the laughs, the arguments, everything. They all mean a lot to me.",
      "I love you so much. And I love you the way you love your cat,and love the way you love your cat nd the way you take care of her, and how sweet you can be with the things you love. You really are such a sweet person. Yeah, you can be harsh with me sometimes, but honestly, I don’t care. I know you’ll be okay, and I want you to know that none of this is your fault. You didn’t do anything wrong. And no, I don’t hate you, okay? Never.",
      "Maybe you hate me sometimes, and honestly that’s okay too. I kinda like it. The way you get annoyed at me is weirdly cute and adorable. So yeah, keep being you. Keep going. You still have so many things to do, so many dreams to chase, and I know you’ll achieve them. I’m genuinely proud of you, okay? Don’t ever forget that.",
      "I hope you like the watermelons and the cake. I honestly don’t even know how they turned out or whether you’ll actually like them, but I genuinely tried my best. I’m not an artist, okay? So please deal with whatever the hell I managed to make. Hahaha. But I made all of it for you, and that’s what matters to me. I just wanted to give you something that came from me and hopefully put a little smile on your face.",
      "I hope your birthday goes amazingly. I hope you smile a lot today. I hope you have the best day, because you deserve it.",
      "Happy Birthday, Aafraa <3",
      "Muahhh."
    ],
    closing: "I adore you more than I know how to put into words.",
    signature: "Your idiot",
  },

  // Physics & Gameplay Tuning
  player: {
    moveSpeed: 7.5,
    runSpeedMultiplier: 1.45,
    jumpForce: 8.5,
    doubleJumpForce: 7.8,
    gravity: 24.0,
    turnSmoothing: 0.12,
    radius: 0.5,
    height: 1.6,
  },

  psyduck: {
    pickupRadius: 2.2,
    throwSpeed: 16.0,
    runThrowSpeedMultiplier: 1.35,
    throwUpwardBias: 4.5,
    bounceRestitution: 0.5,
    friction: 0.98,
    radius: 0.55,
  },

  bowling: {
    laneWidth: 4.2,
    laneLength: 22.0,
    pinSpacing: 0.7,
    pinRadius: 0.22,
    pinHeight: 1.0,
    pinsCount: 10,
  },

  camera: {
    distance: 6.5,
    height: 3.2,
    fov: 60,
    sensitivity: 0.0028,
  }
};

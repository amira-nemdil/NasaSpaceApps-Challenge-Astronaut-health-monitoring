export const METRICS = [
  {
    id: 'headache', name: 'Headache severity', unit: '0-10', part: 'head',
    min: 0, max: 10, step: 1, default: 0,
    normal: [0, 0], warning: [[1, 6]], critical: [['>=', 7]],
    advice: {
     warning: 'close the eyes and relaxe ,drink water and re-check in 30 minutes.',
      critical: 'Stop tasks, rest, and contact the flight surgeon.',
    } 
  },

  {
    id: 'sleepLoss', name: 'Sleep deficit', unit: 'h', part: 'head',
    min: 0, max: 24, step: 1, default: 0,
    normal: [0, 0], warning: [[1, 2]], critical: [['>', 2]],
    advice: {
      warning: 'Schedule a full sleep period soon and avoid demanding tasks.',
      critical: 'Sleep now and hand over critical tasks (microsleep risk).',
    }
  },
  {
    id: 'heartRate', name: 'Resting heart rate', unit: 'bpm', part: 'heart',
    min: 30, max: 180, step: 1, default: 70,
    normal: [60, 100], warning: [[50, 59], [101, 120]], critical: [['<', 50], ['>', 120]],
    advice: {
      warning: 'Sit and rest for 15 minutes, hydrate, then re-measure.',
      critical: 'Stop activity, sit or lie down, re-measure and contact the flight surgeon.',
    }
  },
  {
    id: 'stress', name: 'Stress (HRV RMSSD)', unit: 'ms', part: 'heart',
    min: 0, max: 250, step: 1, default: 55,
    normal: [30, 250], warning: [[20, 29]], critical: [['<', 20]],
    advice: {
      warning: 'Take a short break and do 5 minutes of slow breathing.',
      critical: 'Stop non-essential tasks, rest, and talk to a crewmate or the flight surgeon.',
    }
  },
  {
    id: 'breathingRate', name: 'Breathing rate', unit: 'breaths/min', part: 'chest',
    min: 4, max: 40, step: 1, default: 16,
    normal: [12, 20], warning: [[21, 24]], critical: [['<', 12], ['>=', 25]],
    advice: {
      warning: 'Slow your breathing, You need to relax and stretch your body.',
      critical: 'Check the cabin atmosphere now, relax ,bending your knees.',
    }
  },
  {
    id: 'energy', name: 'Energy level', unit: '%', part: 'legs',
    min: 0, max: 100, step: 1, default: 80,
    normal: [51, 100], warning: [[26, 50]], critical: [['<=', 25]],
    advice: {
      warning: ' Take food with carbohydrates like Oats ,Whole-Grain Toast or bananas to prevent a sudden drop.',
      critical: 'Take a long rest and take Fruit Juice,honey,or dried fruit that contain glucose.',
    }
  },

  {
    id: 'diversity', name: 'Microbiome diversity', unit: 'score', part: 'chest',
    min: 0, max: 100, step: 1, default: 80,
    normal: [70, 100], warning: [[20, 69]], critical: [['<', 20]],
    advice: {
      warning: 'Eat more types of vegetables and add fermented foods like yogurt or kefir to your meals.',
      critical: 'Take a daily probiotic supplement and see the flight surgeon to check your gut health.'
    }
  },
  {
    id: 'proteobacteria', name: 'Proteobacteria', unit: '%', part: 'chest',
    min: 0, max: 100, step: 0.1, default: 2,
    normal: [0, 4.9], warning: [[5, 10]], critical: [['>', 10]],
    advice: {
      warning: 'Cut out sugary and highly processed foods immediately. Eat more high-fiber foods like oats and beans.',
      critical: 'Report to the flight surgeon immediately for a gut infection test. You may need antibiotics.'
    }
  },
  {
    id: 'akkermansia', name: 'Akkermansia', unit: '%', part: 'chest',
    min: 0, max: 5, step: 0.1, default: 2.5,
    normal: [1, 5], warning: [[0.1, 0.9]], critical: [['<', 0.1]],
    advice: {
      warning: 'Drink green tea and eat dark berries like cranberries or pomegranates to help these good bacteria grow.',
      critical: 'Take an Akkermansia probiotic supplement, try skipping a meal (fasting), and check your blood sugar with the flight surgeon.'
    }
  },

  {
    id: 'rbc', name: 'Red blood cells', unit: '10^6/uL', part: 'heart',
    min: 1, max: 8, step: 0.1, default: 4.8,
    normal: [4.0, 5.9], warning: [[2.5, 3.9], [6.0, 6.5]], critical: [['<', 2.5], ['>', 6.5]],
    advice: {
      warning: ' Take B12 ,Iron vitamines (fish,Poultry ,beans) , or Take Biotary Supplement.',
      // critical: 'Contact the flight surgeon: possible anemia or dehydration.',
      critical: 'Take Erythropoietin (EPO).',
    }
  },
  {
    id: 'wbc', name: 'White blood cells', unit: '10^3/uL', part: 'heart',
    min: 0, max: 40, step: 0.1, default: 7.5,
    normal: [4.5, 11.0], warning: [[2.0, 4.4], [11.1, 30.0]], critical: [['<', 2.0], ['>', 30.0]],
    advice: {
      warning: 'Eat Meats ,fishes or Lentils (for containing vit b6,zinc,iron ).',
      critical: ' Take antibiotique, antivirus plus isolate from any source of danger.',
    }
  },

  {
    id: 'dizziness', name: 'Dizziness', unit: '0-10', part: 'head',
    min: 0, max: 10, step: 1, default: 0,
    normal: [0, 0], warning: [[1, 3]], critical: [['>=', 4]],
    advice: {
      warning: 'Move slowly, sit down when it comes on, and hydrate.',
      critical: 'Stop standing tasks, lie down, and contact the flight surgeon.',
    }
  },
  {
    id: 'boneMuscleLoss', name: 'Bone & muscle loss', unit: '% loss', part: 'legs',
    min: 0, max: 30, step: 1, default: 0,
    normal: [0, 2], warning: [[3, 9]], critical: [['>=', 10]],
    advice: {
      warning: 'Add a resistance exercise session today.',
      critical: 'Start the full daily resistance protocol and report to the flight surgeon.',
    }
  },
  {
    id: 'visionAcuity', name: 'Vision acuity (20/X)', unit: 'X', part: 'head',
    min: 15, max: 100, step: 5, default: 20,
    normal: [15, 20], warning: [[25, 40]], critical: [['>', 40]],
    advice: {
      warning: 'Re-test your vision and log any blurring.',
      critical: 'Report the vision change to the flight surgeon immediately.',
    }
  },
  {
    id: 'weight', name: 'Weight loss', unit: '% loss', part: 'chest',
    min: 0, max: 20, step: 0.1, default: 0,
    normal: [0, 1.9], warning: [[2, 5]], critical: [['>', 5]],
    advice: {
      warning: 'Review food intake and re-weigh in 3 days.',
      critical: 'Contact nutrition support and the flight surgeon.',
    }
  },
];

export const HAZARDS = [
  { id: 'isolation', name: 'Isolation & Confinement', metrics: ['rbc', 'wbc', 'igg'] },
  { id: 'radiation', name: 'Space Radiation', metrics: ['headache', 'sleepLoss', 'heartRate', 'stress', 'breathingRate', 'energy'] },
  { id: 'distance', name: 'Distance from Earth', metrics: [] },
  { id: 'gravity', name: 'Gravity Fields', metrics: ['dizziness', 'boneMuscleLoss', 'visionAcuity', 'weight'] },
  { id: 'closedEnv', name: 'Hostile & Closed Environment', metrics: ['diversity', 'proteobacteria', 'akkermansia'] },
];

export const LOCATIONS = [
  { id: 'station', name: 'Space station', distance: '400 km', delay: '<1 s' },
  { id: 'moon', name: 'Moon', distance: '384,400 km', delay: '1.3 s' },
  { id: 'mars', name: 'Mars', distance: '55-400 million km', delay: '3-22 min' },
];
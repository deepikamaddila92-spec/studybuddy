require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const seedUsers = [
  { name: 'Rahul Verma', email: 'rahul@demo.com', password: 'password123', course: 'B.Tech CSE', skills: ['DSA', 'Competitive Coding', 'AI/ML'], studyGoal: 'Interview Prep', availability: 'Night', bio: 'Final year CSE student passionate about algorithms.' },
  { name: 'Priya Singh', email: 'priya@demo.com', password: 'password123', course: 'M.Tech CS', skills: ['Web Dev', 'Database', 'System Design'], studyGoal: 'Project Work', availability: 'Morning', bio: 'Full-stack developer learning system design.' },
  { name: 'Aakash Mehta', email: 'aakash@demo.com', password: 'password123', course: 'B.Tech IT', skills: ['AI/ML', 'Data Science', 'Python'], studyGoal: 'Research', availability: 'Afternoon', bio: 'ML enthusiast working on NLP projects.' },
  { name: 'Sneha Gupta', email: 'sneha@demo.com', password: 'password123', course: 'BCA', skills: ['Web Dev', 'Mobile Dev'], studyGoal: 'Skill Building', availability: 'Morning', bio: 'Frontend developer exploring React and Flutter.' },
  { name: 'Dev Nair', email: 'dev@demo.com', password: 'password123', course: 'B.Tech ECE', skills: ['DSA', 'System Design', 'DevOps'], studyGoal: 'Interview Prep', availability: 'Night', bio: 'Preparing for FAANG with focus on system design.' },
  { name: 'Meera Reddy', email: 'meera@demo.com', password: 'password123', course: 'MCA', skills: ['Database', 'Web Dev', 'Cloud Computing'], studyGoal: 'Project Work', availability: 'Weekends', bio: 'Cloud enthusiast building serverless apps.' },
  { name: 'Arjun Kapoor', email: 'arjun@demo.com', password: 'password123', course: 'B.Tech CSE', skills: ['Competitive Coding', 'DSA'], studyGoal: 'Competitive Coding', availability: 'Night', bio: 'Codeforces Candidate Master, love competitive programming.' },
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    await User.deleteMany({});
    console.log('🗑  Cleared users collection');
    const created = await User.create(seedUsers);
    console.log(`🌱 Seeded ${created.length} demo users`);
    console.log('\nDemo credentials (all passwords: password123):');
    created.forEach((u) => console.log(`  ${u.email}`));
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
};

seed();

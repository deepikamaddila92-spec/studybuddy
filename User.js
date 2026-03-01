const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const VALID_SKILLS = [
  'DSA', 'Web Dev', 'AI/ML', 'System Design',
  'Database', 'Mobile Dev', 'DevOps', 'Competitive Coding',
  'Data Science', 'Cloud Computing', 'Cybersecurity', 'Blockchain'
];

const VALID_GOALS = [
  'Interview Prep', 'Exam Prep', 'Project Work',
  'Competitive Coding', 'Research', 'Skill Building'
];

const VALID_AVAILABILITY = ['Morning', 'Afternoon', 'Night', 'Weekends', 'Flexible'];

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [60, 'Name cannot exceed 60 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // never returned in queries by default
    },
    course: {
      type: String,
      trim: true,
      maxlength: [100, 'Course name too long'],
      default: '',
    },
    skills: {
      type: [String],
      validate: {
        validator: (arr) => arr.length <= 10,
        message: 'Cannot have more than 10 skills',
      },
      default: [],
    },
    studyGoal: {
      type: String,
      enum: { values: VALID_GOALS, message: '{VALUE} is not a valid study goal' },
      default: 'Skill Building',
    },
    availability: {
      type: String,
      enum: { values: VALID_AVAILABILITY, message: '{VALUE} is not a valid availability' },
      default: 'Flexible',
    },
    bio: {
      type: String,
      maxlength: [300, 'Bio cannot exceed 300 characters'],
      default: '',
    },
    avatarUrl: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    connections: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ---- Indexes ----
userSchema.index({ skills: 1 });
userSchema.index({ studyGoal: 1 });
userSchema.index({ availability: 1 });
userSchema.index({ name: 'text', course: 'text', bio: 'text' });

// ---- Hash password before save ----
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ---- Instance method: compare password ----
userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// ---- Instance method: safe public profile ----
userSchema.methods.toPublicProfile = function () {
  return {
    _id: this._id,
    name: this.name,
    course: this.course,
    skills: this.skills,
    studyGoal: this.studyGoal,
    availability: this.availability,
    bio: this.bio,
    avatarUrl: this.avatarUrl,
    isActive: this.isActive,
    lastSeen: this.lastSeen,
    createdAt: this.createdAt,
  };
};

// ---- Static: valid options ----
userSchema.statics.validOptions = () => ({
  skills: VALID_SKILLS,
  goals: VALID_GOALS,
  availability: VALID_AVAILABILITY,
});

module.exports = mongoose.model('User', userSchema);

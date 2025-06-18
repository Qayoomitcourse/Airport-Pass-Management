// /sanity/schemas/user.ts

import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'user',
  title: 'User',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    
    // --- THIS FIELD HAS BEEN CORRECTED ---
    defineField({
      name: 'email',
      title: 'Email',
      type: 'string',
      isUnique: true, // The 'unique' check must be a top-level property.
      validation: (Rule) => [
        Rule.required(),
        Rule.email(), // Added email format validation for better data quality.
      ],
    }),

    defineField({
      name: 'image',
      title: 'Image',
      type: 'url',
      description: 'Populated from social login (e.g., GitHub). Optional for credentialed users.',
    }),
    defineField({
      name: 'role',
      title: 'Role',
      type: 'string',
      options: {
        list: [
          { title: 'Admin', value: 'admin' },
          { title: 'Editor (Read/Add)', value: 'editor' },
          { title: 'Viewer (Read-Only)', value: 'viewer' },
        ],
        layout: 'radio',
      },
      initialValue: 'viewer',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'hashedPassword',
      title: 'Hashed Password',
      type: 'string',
      description: 'This is for credential-based login. Will be empty for GitHub-only users.',
      // IMPORTANT: After creating your admin user, change this back to `readOnly: true` for security!
      readOnly: true, 
    }),
    defineField({
      name: 'provider',
      title: 'Sign-in Provider',
      type: 'string',
      readOnly: true,
      initialValue: 'credentials',
    }),
  ],
})
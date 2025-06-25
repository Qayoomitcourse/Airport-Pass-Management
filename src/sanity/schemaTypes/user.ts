import { defineField, defineType } from 'sanity';

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
    defineField({
      name: 'email',
      title: 'Email',
      type: 'string',
      validation: (Rule) =>
        Rule.required()
          .email()
          .custom(async (email, context) => {
            const client = context.getClient?.({ apiVersion: '2023-01-01' });

            if (!email || !client || !context.document || !context.document._id) {
              return true;
            }

            const id = context.document._id;

            const existingUser = await client.fetch(
              `*[_type == "user" && email == $email && _id != $id][0]`,
              { email, id }
            );

            return existingUser ? 'Email must be unique' : true;
          }),
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
      readOnly: true,
    }),
    defineField({
      name: 'provider',
      title: 'Sign-in Provider',
      type: 'string',
      readOnly: true,
      initialValue: 'credentials',
    }),
    // ✅ NEW FIELDS FOR PASSWORD RESET FLOW
    defineField({
      name: 'requiresPasswordChange',
      title: 'Requires Password Change',
      type: 'boolean',
      initialValue: false,
      hidden: true,
    }),
    defineField({
      name: 'resetToken',
      title: 'Password Reset Token',
      type: 'string',
      hidden: true,
    }),
    defineField({
      name: 'resetTokenExpires',
      title: 'Token Expiry',
      type: 'datetime',
      hidden: true,
    }),
  ],
});

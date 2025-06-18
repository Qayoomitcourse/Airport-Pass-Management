// schemas/task.ts
import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'task',
  title: 'Task',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
    }),
    defineField({
      // This creates the connection to the user who created the task
      name: 'author',
      title: 'Author',
      type: 'reference',
      to: {type: 'user'}, // This links to our 'user' schema
    //   readonly: true, // Make it read-only in the studio
    }),
  ],
})
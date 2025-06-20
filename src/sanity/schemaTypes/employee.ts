// /src/sanity/schemaTypes/employee.ts

import { defineField, defineType } from 'sanity';

export default defineType({
  name: 'employeePass',
  title: 'Employee Pass',
  type: 'document',
  fields: [
    defineField({
      name: 'passId',
      title: 'Pass ID',
      type: 'number',
      description: 'System-generated unique Pass ID.',
      readOnly: true,
      validation: (Rule) =>
        Rule.required()
          .integer()
          .positive()
          .custom(async (value, context) => {
            const { document, getClient } = context;
            if (!value || !document?.category) return true;
            const client = getClient({ apiVersion: '2023-05-03' });
            const id = document._id.replace(/^drafts\./, '');
            const params = { draftId: `drafts.${id}`, publishedId: id, category: document.category, passId: value };
            const query = `*[_type == "employeePass" && _id != $draftId && _id != $publishedId && category == $category && passId == $passId][0]`;
            const existingPass = await client.fetch(query, params);
            if (existingPass) return `Pass ID ${value} already exists for the '${document.category}' category.`;
            return true;
          }),
    }),
    defineField({
      name: 'category',
      title: 'Pass Category',
      type: 'string',
      options: { list: ['cargo', 'landside'], layout: 'radio' },
      validation: Rule => Rule.required(),
      initialValue: 'cargo',
    }),
    defineField({
      name: 'name',
      title: 'Full Name',
      type: 'string',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'cnic',
      title: 'CNIC (National ID)',
      type: 'string',
      validation: (Rule) =>
        Rule.required()
          // *** THE FIX IS HERE: Replaced .regex() with .custom() for format validation ***
          .custom((value) => {
            if (typeof value === 'undefined') {
              return true; // Let the .required() rule handle it
            }
            const cnicPattern = /^\d{5}-\d{7}-\d{1}$/;
            if (cnicPattern.test(value)) {
              return true; // It's valid
            }
            return 'CNIC must be in the format XXXXX-XXXXXXX-X'; // Custom error message
          })
          // The uniqueness check remains as a separate .custom() call
          .custom(async (value, context) => {
            const { document, getClient } = context;
            if (!value || !document) return true;
            const client = getClient({ apiVersion: '2023-05-03' });
            const id = document._id.replace(/^drafts\./, '');
            const existing = await client.fetch(
                `*[_type == "employeePass" && cnic == $value && _id != $id && _id != 'drafts.${id}'][0]._id`,
                { value, id }
            );
            return existing ? 'This CNIC already exists.' : true
          }),
    }),
    defineField({
      name: 'photo',
      title: 'Photo',
      type: 'image',
      options: { hotspot: true },
    }),
    defineField({
      name: 'designation',
      title: 'Designation',
      type: 'string',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'organization',
      title: 'Organization',
      type: 'string',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'areaAllowed',
      title: 'Area(s) Allowed',
      type: 'array',
      of: [{ type: 'string' }],
      options: { layout: 'tags' },
      validation: Rule => Rule.required().min(1),
    }),
    defineField({
      name: 'dateOfEntry',
      title: 'Date of Entry',
      type: 'date',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'dateOfExpiry',
      title: 'Date of Expiry',
      type: 'date',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'author',
      title: 'Author',
      type: 'reference',
      to: { type: 'user' },
      readOnly: true,
    }),
  ],
  orderings: [
    { title: 'Category, then Pass ID', name: 'categoryPassIdAsc', by: [{ field: 'category', direction: 'asc' }, { field: 'passId', direction: 'asc' }] },
    { title: 'Recently Created', name: 'creationDateDesc', by: [{ field: '_createdAt', direction: 'desc' }] },
  ],
  preview: {
    select: { title: 'name', passId: 'passId', media: 'photo', category: 'category' },
    prepare({ title, passId, media, category }) {
      const formattedId = passId ? String(passId).padStart(4, '0') : '...';
      const categoryLabel = category ? category.charAt(0).toUpperCase() + category.slice(1) : ''
      return { title: `${title} (${formattedId})`, subtitle: `${categoryLabel} Pass`, media }
    },
  },
});
// your-sanity-project/schemas/employeePass.ts
import { defineField, defineType } from 'sanity'
import type { InitialValueResolverContext } from 'sanity'

export default defineType({
  name: 'employeePass',
  title: 'Employee Pass',
  type: 'document',
  fields: [
    defineField({
      name: 'category',
      title: 'Pass Category',
      type: 'string',
      options: {
        list: [
          { title: 'Cargo Pass', value: 'cargo' },
          { title: 'Landside Pass', value: 'landside' },
        ],
        layout: 'radio',
      },
      validation: Rule => Rule.required(),
      initialValue: 'cargo',
    }),
    defineField({
      name: 'passId',
      title: 'Pass ID',
      type: 'string', // Still a string to allow for formatting like "0001"
      description: 'System-generated unique Pass ID (e.g., 0001, 0002).',
      readOnly: true, // Users cannot edit this in the Studio; it's set by the API
      validation: Rule => Rule.required().custom(async (value, context) => {
        const { document, getClient } = context
        if (!value || !document) return true
        
        const client = getClient({ apiVersion: '2023-01-01' })
        const existing = await client.fetch(
          `*[_type == "employeePass" && passId == $value && _id != $id][0]._id`,
          { value, id: document._id || '' }
        );
        return existing ? 'This Pass ID already exists. Pass ID must be unique.' : true
      }),
    }),
    defineField({
      name: 'dateOfEntry', // Keep this as the user-defined entry date for the pass information
      title: 'Date of Entry (Pass Start Date)',
      type: 'date',
      options: { dateFormat: 'DD-MM-YYYY' },
      validation: Rule => Rule.required(),
    }),
    // Renaming this for clarity, as Sanity has its own _createdAt
    defineField({
        name: 'passDocumentCreatedAt',
        title: 'Pass Document Creation Date',
        type: 'datetime', // Use datetime for precision
        readOnly: true, // Set by the system
        hidden: true, // Often not needed for users to see directly if _createdAt is used for sorting
      }),
    defineField({
      name: 'photo',
      title: 'Photo',
      type: 'image',
      options: { hotspot: true },
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'name',
      title: 'Full Name',
      type: 'string',
      validation: Rule => Rule.required(),
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
      name: 'cnic',
      title: 'CNIC (National ID)',
      type: 'string',
      validation: Rule =>
        Rule.required()
          .regex(/^\d{5}-\d{7}-\d{1}$/, { name: 'cnicFormat' })
          .error('CNIC must be in XXXXX-XXXXXXX-X format')
          .custom(async (value, context) => { // Make custom validation async
            const { document, getClient } = context
            if (!value || !document) return true
            // Use the writeClient or a client configured for reads if different
            const client = getClient({ apiVersion: '2023-01-01' }) 
            const existing = await client.fetch(
                `*[_type == "employeePass" && cnic == $value && _id != $id][0]._id`, // Fetch just _id for efficiency
                { value, id: document._id || '' } // Provide a fallback for document._id if it's a new unsaved doc
            );
            return existing ? 'This CNIC already exists.' : true
          }),
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
      name: 'dateOfExpiry',
      title: 'Date of Expiry',
      type: 'date',
      options: { dateFormat: 'DD-MM-YYYY' },
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'author',
      title: 'Author',
      description: 'The user who created this pass.',
      type: 'reference',
      to: { type: 'user' }, 
      readOnly: true,
      validation: Rule => Rule.required(),
      // Fixed initialValue - always returns a valid reference object
      initialValue: async (props: unknown, context: InitialValueResolverContext) => {
        const { currentUser } = context;
        if (currentUser?.id) {
          return {
            _ref: currentUser.id,
            _type: 'reference'
          };
        }
        // Return a default system user reference instead of undefined
        // Make sure this user exists in your Sanity dataset
        return {
          _ref: 'system-user', // Replace with an actual user ID from your dataset
          _type: 'reference'
        };
      }
    }),
  ],

  orderings: [
    {
      title: 'Category, then Pass ID Asc',
      name: 'categoryPassIdAsc',
      by: [
        { field: 'category', direction: 'asc' },
        { field: 'passId', direction: 'asc' }, // Ensure this sorting works with string numbers
      ],
    },
     { // Add ordering by document creation time for finding the "latest"
      title: 'Document Creation Time Desc',
      name: 'passDocumentCreatedAtDesc',
      by: [{ field: 'passDocumentCreatedAt', direction: 'desc' }],
    },
  ],

  preview: {
    select: {
      title: 'name',
      subtitle: 'passId',
      media: 'photo',
      category: 'category',
    },
    prepare(selection) {
      const { title, subtitle, media, category } = selection
      const categoryLabel = category ? category.charAt(0).toUpperCase() + category.slice(1) : ''
      return {
        title: title,
        subtitle: `${categoryLabel} Pass ID: ${subtitle || 'GENERATING...'}`, // Update preview
        media: media,
      }
    },
  },
})
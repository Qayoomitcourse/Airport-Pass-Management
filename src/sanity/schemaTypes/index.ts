import { type SchemaTypeDefinition } from 'sanity'
import employee from './employee'
import user from './user'
import task from './task'

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [employee, user, task],
}

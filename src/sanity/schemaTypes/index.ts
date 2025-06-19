import { type SchemaTypeDefinition } from 'sanity'
import employee from './employee'
import task from './task'
import user from './user'

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [employee, task, user],
}

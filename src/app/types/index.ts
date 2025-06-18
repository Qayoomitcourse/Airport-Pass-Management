// app/types.ts (or your types file)
import { Image } from 'sanity';

export type PassCategory = 'cargo' | 'landside'; // Define the possible categories

export interface EmployeePass {
  _id: string;
  _type: 'employeePass';
  _createdAt: string;
  _updatedAt: string;
  category: PassCategory; // Added category
  passId: string;
  dateOfEntry: string;
  photo?: Image; // Make photo optional if it can be missing
  name: string;
  designation: string;
  organization: string;
  cnic: string;
  areaAllowed: string[];
  dateOfExpiry: string;
}
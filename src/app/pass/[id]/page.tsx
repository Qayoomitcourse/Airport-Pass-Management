// app/pass/[id]/page.tsx
import { client } from '@/sanity/lib/client'
import Image from 'next/image'
import { notFound } from 'next/navigation'

interface Props {
  params: { id: string }
}

export default async function PassDetailsPage({ params }: Props) {
  const [category, passId] = params.id.split('-') // e.g., landside-00001

  if (!category || !passId) return notFound()

  let query = ''
  const projection = `
    name,
    designation,
    organization,
    cnic,
    photo {
      asset->{
        url
      }
    }
  `

  if (category === 'cargo') {
    query = `*[_type == "cargoPass" && passId == $id][0]{${projection}}`
  } else if (category === 'landside') {
    query = `*[_type == "landsidePass" && passId == $id][0]{${projection}}`
  } else {
    return notFound()
  }

  const pass = await client.fetch(query, { id: passId })

  if (!pass) return notFound()

  return (
    <div className="max-w-sm mx-auto mt-10 p-6 border rounded shadow text-center bg-white">
      <h1 className="text-2xl font-semibold mb-4 capitalize">
        {category} Entry Pass
      </h1>

      {pass.photo?.asset?.url && (
        <Image
          src={pass.photo.asset.url}
          alt={pass.name}
          width={150}
          height={150}
          className="mx-auto mb-4 rounded border"
        />
      )}

      <div className="space-y-1 text-left">
        <p><strong>Name:</strong> {pass.name}</p>
        <p><strong>Designation:</strong> {pass.designation}</p>
        <p><strong>Organization:</strong> {pass.organization}</p>
        <p><strong>CNIC:</strong> {pass.cnic}</p>
      </div>
    </div>
  )
}

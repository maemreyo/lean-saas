// app/dashboard/projects/page.tsx
import { requireAuth } from '@/lib/auth/server'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { createAuthClient } from '@/lib/auth/server'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

export default async function ProjectsPage() {
  const user = await requireAuth()
  const supabase = await createAuthClient()
  
  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('created_by', user.id)
    .order('created_at', { ascending: false })
  
  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <Button asChild>
            <Link href="/dashboard/projects/new">
              Create Project
            </Link>
          </Button>
        </div>
        
        {projects && projects.length > 0 ? (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {projects.map((project) => (
                <li key={project.id}>
                  <div className="px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <svg className="h-6 w-6 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                          </svg>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="flex items-center">
                          <div className="text-sm font-medium text-gray-900">
                            {project.name}
                          </div>
                          <div className={`ml-2 flex-shrink-0 flex ${{
                            active: 'text-green-800 bg-green-100',
                            archived: 'text-yellow-800 bg-yellow-100',
                            deleted: 'text-red-800 bg-red-100'
                          }[project.status as string]}`}>
                            <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full">
                              {project.status}
                            </p>
                          </div>
                        </div>
                        <div className="text-sm text-gray-500">
                          {project.description || 'No description'}
                        </div>
                        <div className="text-xs text-gray-400">
                          Created {new Date(project.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm">
                        Archive
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M34 40h10v-4a6 6 0 00-10.712-3.714M34 40H14m20 0v-4a9.971 9.971 0 00-.712-3.714M14 40H4v-4a6 6 0 0110.713-3.714M14 40v-4c0-1.313.253-2.566.713-3.714m0 0A10.003 10.003 0 0124 26c4.21 0 7.813 2.602 9.288 6.286M30 14a6 6 0 11-12 0 6 6 0 0112 0zm12 6a4 4 0 11-8 0 4 4 0 018 0zm-28 0a4 4 0 11-8 0 4 4 0 018 0z"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No projects</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating a new project.
            </p>
            <div className="mt-6">
              <Button asChild>
                <Link href="/dashboard/projects/new">
                  Create your first project
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

import Link from 'next/link';
import Image from 'next/image';

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Auth form */}
      <div className="flex flex-col justify-center flex-1 px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <div className="w-full max-w-sm mx-auto lg:w-96">
          <div className="mb-6">
            <Link href="/" className="flex items-center">
              <span className="text-xl font-bold text-gray-900">Prosparity</span>
            </Link>
          </div>
          {children}
        </div>
      </div>
      
      {/* Right side - Image */}
      <div className="relative hidden w-0 flex-1 lg:block">
        <div className="absolute inset-0 flex flex-col justify-center bg-indigo-600">
          <div className="p-8">
            <h2 className="text-4xl font-extrabold text-white mb-6">
              Streamline your sales workflow
            </h2>
            <p className="text-lg text-indigo-100 mb-8">
              Manage leads, track deals, and close more business with our all-in-one sales platform.
            </p>
            <div className="flex space-x-4">
              <div className="bg-white bg-opacity-10 p-4 rounded-lg">
                <h3 className="text-xl font-bold text-white mb-2">Lead Management</h3>
                <p className="text-indigo-100">Organize and prioritize prospects</p>
              </div>
              <div className="bg-white bg-opacity-10 p-4 rounded-lg">
                <h3 className="text-xl font-bold text-white mb-2">Task Tracking</h3>
                <p className="text-indigo-100">Never miss a follow-up again</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
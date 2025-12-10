'use client';

export function Header() {
  return (
    <header className="border-b bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
        <div className="flex items-center space-x-3">
          <h1 className="text-2xl font-bold text-gray-900">
            Cheft
          </h1>
          <span className="rounded bg-orange-100 px-2 py-1 text-xs font-medium text-orange-800">
            Beta
          </span>
        </div>
        
        <div className="flex items-center space-x-4">
          <p className="hidden text-sm text-gray-600 sm:block">
            Find restaurants from your favorite TV chefs
          </p>
        </div>
      </div>
    </header>
  );
}
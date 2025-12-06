import { Link } from 'react-router-dom'

export default function Header() {
  return (
    <header className="bg-[#1a1f2e] backdrop-blur-md border-b border-[#2d3548] sticky top-0 z-50">
      <div className="max-w-[1400px] mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img 
              src="/logo.png" 
              alt="Moodflo Logo" 
              className="h-8 w-8"
            />
            <img 
              src="/moodflo-white.svg" 
              alt="Moodflo" 
              className="h-8"
            />
          </Link>
        </div>
      </div>
    </header>
  )
}

import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { 
  CpuIcon,
  BrainIcon
} from "lucide-react";

const Header = () => {
  const [location] = useLocation();

  return (
    <header className="relative z-10 border-b border-nvidia-dark">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center">
          <Link href="/">
            <div className="flex items-center">
              <div className="text-nvidia-green text-2xl font-bold mr-2">
                <CpuIcon />
              </div>
              <h1 className="text-2xl font-bold">
                <span className="text-nvidia-green">Jensen</span>GPT
              </h1>
            </div>
          </Link>
        </div>
        <nav className="hidden md:block">
          <ul className="flex space-x-6">
            <li>
              <Link href="/">
                <span className={`hover:text-nvidia-green transition-colors duration-200 cursor-pointer ${location === '/' ? 'text-nvidia-green' : ''}`}>
                  Home
                </span>
              </Link>
            </li>
            <li>
              <Link href="/chat">
                <span className={`hover:text-nvidia-green transition-colors duration-200 cursor-pointer ${location === '/chat' ? 'text-nvidia-green' : ''}`}>
                  Chat
                </span>
              </Link>
            </li>
            <li>
              <Link href="/cognitive">
                <span className={`hover:text-nvidia-green transition-colors duration-200 cursor-pointer flex items-center gap-1 ${location === '/cognitive' ? 'text-nvidia-green' : ''}`}>
                  <BrainIcon size={16} />
                  <span>Cognitive</span>
                  <span className="ml-1 bg-yellow-600 text-yellow-100 text-[10px] px-1.5 py-0.5 rounded-full font-medium inline-flex items-center">Coming Soon</span>
                </span>
              </Link>
            </li>
            <li>
              <a 
                href="https://build.nvidia.com/explore/discover/nemotron" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-nvidia-green transition-colors duration-200"
              >
                Documentation
              </a>
            </li>
            <li>
              <Button
                variant="outline"
                className="text-nvidia-green border-nvidia-green hover:bg-nvidia-green hover:text-nvidia-darker"
              >
                Sign In
              </Button>
            </li>
          </ul>
        </nav>
        <div className="md:hidden">
          <Button
            variant="ghost"
            className="text-nvidia-green"
            aria-label="Menu"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;

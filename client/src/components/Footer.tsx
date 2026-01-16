import { Link } from "wouter";

const Footer = () => {
  return (
    <footer className="relative z-10 border-t border-nvidia-dark py-6">
      <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center">
        <div className="text-sm text-gray-400 mb-4 md:mb-0">
          &copy; {new Date().getFullYear()} JensenGPT. Powered by NVIDIA. All rights reserved.
        </div>
        <div className="flex space-x-6">
          <a 
            href="#" 
            className="text-sm text-gray-400 hover:text-nvidia-green transition-colors duration-200"
          >
            Terms
          </a>
          <a 
            href="#" 
            className="text-sm text-gray-400 hover:text-nvidia-green transition-colors duration-200"
          >
            Privacy
          </a>
          <a 
            href="https://build.nvidia.com/explore/discover/nemotron" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-gray-400 hover:text-nvidia-green transition-colors duration-200"
          >
            Documentation
          </a>
          <a 
            href="mailto:support@jensengpt.example.com" 
            className="text-sm text-gray-400 hover:text-nvidia-green transition-colors duration-200"
          >
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

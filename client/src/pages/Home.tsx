import { useCallback } from "react";
import { useLocation } from "wouter";
import WelcomeSection from "@/components/WelcomeSection";

const Home = () => {
  const [, navigate] = useLocation();

  const handleStartChat = useCallback(() => {
    navigate("/chat");
  }, [navigate]);

  return (
    <WelcomeSection onStartChat={handleStartChat} />
  );
};

export default Home;

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Button } from '../components/ui/button';
import { ThoughtExtensionWorkspace } from '../components/ThoughtExtensionWorkspace';
import { IdeaEvolutionLaboratory } from '../components/IdeaEvolutionLaboratory';
import { ArrowLeftIcon, BrainIcon, Lightbulb, Sparkles } from 'lucide-react';
import { Link } from 'wouter';
import { PageTransition } from '../components/PageTransition';

export default function CognitiveEnhancer() {
  const [activeTab, setActiveTab] = useState('thoughts');

  return (
    <PageTransition>
      <div className="container py-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="ghost" size="icon" className="mr-2">
                <ArrowLeftIcon size={18} />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <BrainIcon className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Cognitive Augmentation Suite</h1>
                <p className="text-muted-foreground">Extend your thinking, evolve your ideas.</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mb-8 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-md shadow-sm flex items-center">
          <Sparkles className="h-5 w-5 mr-3 text-yellow-600" />
          <div>
            <h2 className="font-semibold text-lg mb-1">Coming Soon</h2>
            <p className="text-sm">
              The Cognitive Augmentation Suite is under active development. Some features may not be fully functional yet.
              We're working hard to bring you the complete experience soon!
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="thoughts" className="text-base py-3 flex gap-2 items-center">
              <Sparkles className="h-5 w-5" />
              <span>Thought Extension</span>
            </TabsTrigger>
            <TabsTrigger value="ideas" className="text-base py-3 flex gap-2 items-center">
              <Lightbulb className="h-5 w-5" />
              <span>Idea Evolution</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="thoughts" className="min-h-[calc(100vh-250px)]">
            <div className="bg-white rounded-lg shadow p-6">
              <ThoughtExtensionWorkspace />
            </div>
          </TabsContent>

          <TabsContent value="ideas" className="min-h-[calc(100vh-250px)]">
            <div className="bg-white rounded-lg shadow p-6">
              <IdeaEvolutionLaboratory />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PageTransition>
  );
}
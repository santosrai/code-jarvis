
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DISCORD_COMMUNITY_URL } from "@/lib/constants";
import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";

export default function HelpPage() {
  return (
    <div className="container mx-auto max-w-3xl py-12 px-4">
      <Button variant="outline" asChild className="mb-8">
        <Link href="/">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to App
        </Link>
      </Button>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl">BioAI CoPilot Lite - Help & FAQ</CardTitle>
          <CardDescription>
            Welcome! This page provides a basic overview and answers to frequently asked questions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-2">What is BioAI CoPilot Lite?</h2>
            <p className="text-muted-foreground">
              BioAI CoPilot Lite is a client-centric web application designed to assist with bioinformatics tasks using natural language.
              It can help you find protein information, predict structures (e.g., using ESMFold-like models via backend APIs),
              and visualize molecular data. All your session data ("scripts") are stored locally in your web browser.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Key Features</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li><strong>Natural Language Chat:</strong> Interact with the CoPilot using plain English commands.</li>
              <li><strong>Script Management:</strong> Your conversations are saved as "scripts" in your browser. You can create, rename, open, delete, export, and import scripts.</li>
              <li><strong>Protein Folding:</strong> Request protein structure prediction for a given sequence.</li>
              <li><strong>Data Retrieval:</strong> Search for proteins and small molecule SMILES strings.</li>
              <li><strong>3D Visualization:</strong> View predicted structures and other molecular data (placeholder for full 3D viewer).</li>
              <li><strong>Local Storage:</strong> All your data (profile, scripts) is stored in your browser's local storage. No cloud accounts needed.</li>
            </ul>
          </section>
          
          <section>
            <h2 className="text-xl font-semibold mb-2">Data Storage & Privacy</h2>
            <p className="text-muted-foreground">
              Your "Display Name", "Estimated GPU Usage", and all "Scripts" (chat history and visualization data) are stored directly in your web browser's <code>localStorage</code>.
              This means your data is private to your browser on your computer. It is not sent to any central server for storage.
            </p>
            <p className="text-muted-foreground mt-2">
              <strong>Important:</strong> Since data is local, clearing your browser's cache/storage for this site will delete your scripts. Use the "Export Script" feature to back up important work.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Example Commands</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>"Find human trypsin"</li>
              <li>"Fold P04637" or "Fold sequence MKT..."</li>
              <li>"What is the SMILES for aspirin?"</li>
              <li>"Visualize uploaded PDB" (after uploading a PDB file)</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              When you start a new chat, some example prompts will be suggested.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Getting Support</h2>
            <p className="text-muted-foreground">
              Join our community on Discord for help, discussions, and to share feedback!
            </p>
            <Button asChild className="mt-2">
              <Link href={DISCORD_COMMUNITY_URL} target="_blank" rel="noopener noreferrer">
                Join Discord Community <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}

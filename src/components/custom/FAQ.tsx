import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQContent: React.FC<{}> = ({}) => {
  return (
    <div>
      <CardHeader>
        <CardTitle>What is Smoke?</CardTitle>
        <CardDescription>It's faster than Visa</CardDescription>
      </CardHeader>
      <CardContent>
        Smoke is a credit card protocol that helps you spend your money on any
        chain out there. Instantly. Faster than Visa.{" "}
        <Accordion type="multiple">
          <AccordionItem value="item-1">
            <AccordionTrigger>Why am I minting an NFT?</AccordionTrigger>
            <AccordionContent>
              This NFT represents your cross chain account. All your spends and
              deposits are attached to your NFT ID.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger>How can I start using it?</AccordionTrigger>
            <AccordionContent>
              When you mint this NFT, you get a small credit to spend. Try it
              out on the next but next screen.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-3">
            <AccordionTrigger>What is Autogas?</AccordionTrigger>
            <AccordionContent>
              Autogas is a feature that automatically refills your gas if it
              falls below a preset threshold. You'll never have to worry about
              gas every again.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-4">
            <AccordionTrigger>Do I pay back after a month?</AccordionTrigger>
            <AccordionContent>
              You can pay back anytime. Even after a year. This credit you get
              comes with an interest. So the sooner you pay back the better. But
              it's affordable, don't worry :).
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-5">
            <AccordionTrigger>How can I increase my credit?</AccordionTrigger>
            <AccordionContent>
              You can deposit funds on any of the supported chains to increase
              your limit.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-6">
            <AccordionTrigger>
              Can anyone that holds this NFT spend from it?
            </AccordionTrigger>
            <AccordionContent>
              Not exactly. The NFT owner has full authority to approve other
              wallets to spend from it as well. You can also limit who can spend
              from it.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </div>
  );
};

export default FAQContent;

import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertDialog, Flex, Spinner } from "@chakra-ui/react";

const CardFooterContent: React.FC<{ error: any; isConfirmed: boolean }> = ({
  error,
  isConfirmed,
}) => {
  return (
    <div className="w-full max-w-full overflow-hidden">
      {error && (
        <Alert variant="destructive" className="break-words">
          <AlertTitle className="text-lg font-semibold">Error</AlertTitle>
          <AlertDescription className="mt-2">
            <div
              style={{
                overflowWrap: "break-word",
                wordWrap: "break-word",
                wordBreak: "break-all",
                hyphens: "auto",
                whiteSpace: "normal",
              }}
            >
              {error.message}
            </div>
          </AlertDescription>
        </Alert>
      )}  
      {isConfirmed && (
        <Alert className="break-words">
          <AlertTitle className="text-lg font-semibold">Success</AlertTitle>
          <AlertDescription className="mt-2">
              <div>Your gas problems are in the past. </div>
          </AlertDescription>
          <AlertDescription className="mt-2">
            <Flex>
              <div>Finishing final steps...</div>
              <Spinner color="red.500" size="xl" />
            </Flex>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default CardFooterContent;

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, X } from 'lucide-react';
import { GAME_CONFIG } from '../../config/gameConfig';

interface LetterModalProps {
  isOpen: boolean;
  onContinueExploring: () => void;
}

export const LetterModal: React.FC<LetterModalProps> = ({
  isOpen,
  onContinueExploring,
}) => {
  const { letter } = GAME_CONFIG;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="birthday-letter-backdrop"
          id="birthday-letter-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8 bg-black/80 backdrop-blur-md overflow-y-auto"
        >
          <motion.div
            id="birthday-letter-card"
            initial={{ opacity: 0, scale: 0.88, y: 35 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 25 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl bg-[#fffdf9] text-[#2c1810] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] border-4 border-[#e5c07b]/50 p-7 sm:p-12 font-serif select-text"
          >
            {/* Top Close Button */}
            <button
              id="letter-close-btn"
              onClick={onContinueExploring}
              className="absolute top-5 right-5 p-2.5 rounded-full text-[#8c6b4f] hover:text-[#2c1810] hover:bg-[#f7efe3] transition-colors"
              title="Close Letter"
            >
              <X size={24} />
            </button>

            {/* Decorative Celestial Wax Seal Header */}
            <div className="flex flex-col items-center text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#d9534f] to-[#b52b27] flex items-center justify-center text-white shadow-xl border-2 border-[#fff3cd] mb-3.5">
                <Heart size={30} className="fill-current animate-pulse" />
              </div>
              <span className="text-xs sm:text-sm uppercase tracking-widest text-[#a67c52] font-sans font-bold">
                {letter.dateText}
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-[#3e2723] mt-2 tracking-tight">
                {letter.title}
              </h1>
            </div>

            {/* Big, Clearly Readable Letter Body */}
            <div className="space-y-6 text-lg sm:text-xl leading-relaxed text-[#422c1d] px-2 sm:px-6">
              {letter.recipientName ? (
                <p className="font-bold text-xl sm:text-2xl text-[#2c1810]">
                  Dearest {letter.recipientName},
                </p>
              ) : null}

              {letter.paragraphs.map((paragraph, index) => (
                <p key={index} className="text-justify indent-6 font-medium">
                  {paragraph}
                </p>
              ))}

              {(letter.closing || letter.signature) ? (
                <div className="pt-6 border-t-2 border-[#f0dfc8]">
                  {letter.closing ? (
                    <p className="italic text-lg sm:text-xl text-[#795548]">{letter.closing}</p>
                  ) : null}
                  {letter.signature ? (
                    <p className="font-extrabold text-xl sm:text-2xl text-[#3e2723] mt-2 flex items-center gap-2">
                      {letter.signature}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>

            {/* Bottom Actions */}
            <div className="mt-10 pt-6 border-t-2 border-[#eedac5] flex flex-wrap gap-4 justify-between items-center font-sans">
              <div className="ml-auto">
                <button
                  id="continue-exploring-btn"
                  onClick={onContinueExploring}
                  className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 hover:from-amber-600 hover:to-purple-700 text-white text-base sm:text-lg font-bold shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-95 flex items-center gap-2.5 transition-all cursor-pointer"
                >
                  Continue Exploring
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

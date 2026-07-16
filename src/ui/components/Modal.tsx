import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { IconButton } from "./IconButton";

interface ModalProps {
  isOpen: boolean;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
}

export function Modal({ isOpen, title, children, footer, onClose }: ModalProps) {
  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div className="modal-layer" role="presentation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <button className="modal-backdrop" type="button" aria-label="Fermer la fenetre" onClick={onClose} />
          <motion.section
            className="modal-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            initial={{ opacity: 0, scale: 0.98, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 16 }}
            transition={{ duration: 0.22 }}
          >
            <header className="modal-header">
              <h2 id="modal-title">{title}</h2>
              <IconButton icon="close" label="Fermer" onClick={onClose} />
            </header>
            <div className="modal-body">{children}</div>
            {footer ? <footer className="modal-footer">{footer}</footer> : null}
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
import React, { useState, useEffect } from 'react';
import {fetchArticleText} from "./utils/api";
import {useParams} from "react-router-dom";
import './index_interface.css';
import './components/evidence_panel.css'

export default function ArticleViewer({apiUrl}) {
    const [articleText, setArticleText] = useState('PLACEHOLDER');
    const routeParams = useParams();
    const article_id = routeParams.article_id;
    const articleTitle = article_id;

    useEffect(() => {
        console.log("Hola")

        fetchArticleText(apiUrl, article_id).then((text) => setArticleText(text.text))


        // return () => clearTimeout(timer);
    }, [])

    return (<>
                <div className="evidence_pane">
                <h1>{articleTitle}</h1>
                <span dangerouslySetInnerHTML={{__html: articleText}}></span>
                </div>
            </>)
}
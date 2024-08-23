import React, { useState, useEffect } from 'react';
import {fetchArticleText, fetchEvidence} from "./utils/api";
import './index_interface.css';

export default function ArticleViewer({apiUrl, article_id}) {
    const [loading, setLoading] = useState(true);
    const [articleText, setArticleText] = useState('PLACEHOLDER');
    const articleTitle = article_id;

    useEffect(() => {
        console.log("Hola")

        fetchArticleText(apiUrl, article_id).then((text) => setArticleText(text.text))


        // return () => clearTimeout(timer);
    }, [])

    return (<>
                <h1>{articleTitle}</h1>
                <span dangerouslySetInnerHTML={{__html: articleText}}></span>
            </>)
}